// import * as algosdk from "algosdk";
// import {Account, Transaction} from "algosdk";
// import {AlgorandConfig, AlgorandAssetConfig, AlgorandStandardAssetConfig} from "./types";
// import {AssetsRepository} from "./AssetsRepository";
// import {BridgeNetworks} from "src/lib/common/networks/networks";
// import BigNumber from "bignumber.js";
// import {bridgeDeposit, bridgeUSDC} from "./transactions";
// import SendRawTransaction from "algosdk/dist/types/client/v2/algod/sendRawTransaction";
// import {RoutingDefault} from "src/lib/common";
// import {AlgorandAccountsStore} from "./AccountsStore";

// /**
//  *
//  * Algorand connect
//  */
// export class AlgorandConnect {
//     public readonly clientIndexer: algosdk.Indexer;
//     public readonly assetsRepo: AssetsRepository;
//     public readonly config: AlgorandConfig;
//     public readonly client: algosdk.Algodv2;
//     public readonly accountsStore: AlgorandAccountsStore;

//     _lastTxnHash = "";

//     constructor(config: AlgorandConfig) {
//         this.config = config;
//         this.client = this.getAlgodClient();
//         this.clientIndexer = this.getAlgodIndexer();
//         this.assetsRepo = new AssetsRepository(this.client);
//         this.accountsStore = new AlgorandAccountsStore(this.client)

//         config.assets
//             .map((conf:AlgorandStandardAssetConfig | AlgorandAssetConfig) => {
//                 if ((conf as AlgorandStandardAssetConfig).assetId) {
//                     this.assetsRepo.addStandardAsset((conf as AlgorandStandardAssetConfig).assetId, conf)
//                 }
//             })
//     }

//     /**
//      *
//      * @param fromAddress
//      * @param fromSymbol
//      * @param toNetwork
//      * @param toAddress
//      * @param tosymbol
//      * @param amount
//      * @returns {Promise<algosdk.Transaction[]>}
//      */
//     public async bridgeTransactions(
//         sourceAddress: string,
//         destinationNetwork: BridgeNetworks,
//         destinationAdress: string,
//         tokenSymbol: string,
//         amount: bigint
//     ): Promise<algosdk.Transaction[]> {
//         const token = this.assetsRepo.get(tokenSymbol)
//         if (!token) return Promise.reject('Token unsupported')

//         const depositAddress = this.config.bridgeAccounts.usdcDeposit
//         const routing = RoutingDefault();
//         routing.from.address = sourceAddress;
//         routing.from.token = tokenSymbol;
//         routing.from.network = BridgeNetworks.algorand.toString().toLowerCase();
//         routing.to.address = destinationAdress;
//         routing.to.token = token.destinationSymbol[destinationNetwork];
//         routing.to.network = destinationNetwork.toString().toLowerCase();
//         routing.amount = new BigNumber(amount.toString());

//         const transactions = await token.symbol.trim().toLowerCase() === "usdc" ?
//             bridgeUSDC(
//                 this.client,
//                 sourceAddress,
//                 destinationAdress,
//                 destinationNetwork,
//                 new BigNumber(amount.toString()),
//                 depositAddress,
//             token as AlgorandStandardAssetConfig
//             ) : bridgeDeposit(
//                 this.client,
//                 this.config.bridgeProgramId,
//                 sourceAddress,
//                 destinationAdress,
//                 destinationNetwork,
//                 amount,
//                 {algoVault: this.config.bridgeAccounts.algoVault, asaVault: this.config.bridgeAccounts.asaVault},
//                 this.config.bridgeAccounts.feeReceiver,
//                 token
//             )

//         return transactions
//     }

//     /**
//      * @method bridge
//      * @param account
//      * @param fromSymbol
//      * @param toNetwork
//      * @param toAddress
//      * @param tosymbol
//      * @param amount
//      * @returns {Promise<boolean>}
//      */
//     public async bridge(
//         account: AlgorandAccount,
//         fromSymbol: string,
//         toNetwork: string,
//         toAddress: string,
//         tosymbol: string,
//         amount: number
//     ): Promise<boolean> {
//         if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
//         if (!this._bridgeTxnsV1) throw new Error(AlgoError.BRIDGE_NOT_SET);

//         //Get Token
//         const asset = BridgeTokens.get("algorand", fromSymbol);
//         if (!asset) throw new Error(AlgoError.INVALID_ASSET);

//         //Get routing
//         const routing = RoutingDefault();
//         routing.from.address = account.addr;
//         routing.from.token = fromSymbol;
//         routing.from.network = "algorand";

//         routing.to.address = toAddress;
//         routing.to.token = tosymbol;
//         routing.to.network = toNetwork;
//         routing.amount = amount;

//         //Run Transaction
//         let transaction: Transaction[];

//         if (asset.symbol.toLocaleLowerCase() == "usdc" && routing.to.token.toLocaleLowerCase() == "usdc") {
//             transaction = await this._bridgeTxnsV1.HandleUsdcSwap(routing);
//         } else {
//             transaction = await this._bridgeTxnsV1.bridgeTransactions(routing, asset);
//         }

//         await this.signAndSend_SingleSigner(transaction, account);
//         console.log(`Algorand Bridge Transaction Complete`);

//         return true;
//     }

//     /**
//      *
//      *
//      * @method fundAccount
//      * @param funder
//      * @param account
//      * @param amount
//      * @returns {Promise<boolean>}
//      */
//     public async fundAccount(funder: AlgorandAccount, account: AlgorandAccount, amount: number): Promise<boolean> {
//         if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

//         //Get routing
//         const routing = RoutingDefault();
//         routing.from.address = funder.addr;
//         routing.from.token = "algo";
//         routing.from.network = "algorand";

//         routing.to.address = account.addr;
//         routing.to.token = "algo";
//         routing.to.network = "algorand";

//         routing.amount = amount;

//         const returnValue = await this.sendAlgo(routing, funder);
//         return returnValue;
//     }

//     /**
//      *
//      * @method fundAccountToken
//      * @param funder
//      * @param account
//      * @param amount
//      * @param symbol
//      * @returns {Promise<boolean>}
//      */
//     public async fundAccountToken(
//         funder: AlgorandAccount,
//         account: AlgorandAccount,
//         amount: number,
//         symbol: string
//     ): Promise<boolean> {
//         if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

//         //Get Token
//         const asset = BridgeTokens.get("algorand", symbol);
//         if (!asset) throw new Error(AlgoError.INVALID_ASSET);

//         //Get routing
//         const routing = RoutingDefault();
//         routing.from.address = funder.addr;
//         routing.from.token = symbol;
//         routing.from.network = "algorand";

//         routing.to.address = account.addr;
//         routing.to.token = symbol;
//         routing.to.network = "algorand";

//         routing.amount = amount;

//         const returnValue = await this.sendTokens(routing, funder, asset);
//         return returnValue;
//     }

//     /**
//      * @method sendAlgo
//      * @param routing
//      * @param signer
//      * @param debug_rootPath
//      * @returns {Promise<boolean>}
//      */
//     async sendAlgo(routing: Routing, signer: Account, debug_rootPath?: string): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve, reject) => {
//             try {
//                 //Fail Safe
//                 if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
//                 if (!signer) throw new Error(AlgoError.INVALID_SIGNER);

//                 //Get Txns
//                 const transactions: Transaction[] = [];
//                 transactions.push(await this._transactions.sendAlgoTransaction(routing));

//                 //Send
//                 await this.signAndSend_SingleSigner(transactions, signer, debug_rootPath);
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     /**
//      *
//      * @method sendTokens
//      * @param routing
//      * @param signer
//      * @param token
//      * @param debug_rootPath
//      * @returns  {Promise<boolean>}
//      */
//     async sendTokens(routing: Routing, signer: Account, token: BridgeToken, debug_rootPath?: string): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve, reject) => {
//             try {
//                 //Fail Safe
//                 if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
//                 if (!signer) throw new Error(AlgoError.INVALID_SIGNER);

//                 //Get Txn
//                 console.log(
//                     `Sending ${routing.amount} ${token.symbol} from ${routing.from.address} to ${routing.to.address}`
//                 );
//                 const transactions: Transaction[] = [];
//                 transactions.push(await this._transactions.sendTokensTransaction(routing, token));

//                 //Send
//                 await this.signAndSend_SingleSigner(transactions, signer, debug_rootPath);
//                 console.log(`Txn Completed`);
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     /**
//      *
//      * @method mintTokens
//      * @param signers
//      * @param msigParams
//      * @param routing
//      * @param token
//      * @param debug_rootPath
//      * @returns {Promise<boolean>}
//      */
//     async mintTokens(
//         signers: Account[],
//         msigParams: algosdk.MultisigMetadata,
//         routing: Routing,
//         token: BridgeToken,
//         debug_rootPath?: string
//     ): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve, reject) => {
//             try {
//                 //Fail Safe
//                 if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);

//                 //Get Txn
//                 console.log(`Minting ${routing.amount} ${token.symbol} to ${routing.to.address}`);
//                 const transactions: Transaction[] = [];
//                 transactions.push(await this._transactions.sendTokensTransaction(routing, token));

//                 //Send
//                 await this.signAndSend_MultiSig(transactions, signers, msigParams, debug_rootPath);
//                 console.log("Minting Completed");
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     /**
//      *
//      * @method optinToken
//      * @param signer
//      * @param symbol
//      * @returns {Promise<boolean>}
//      */
//     async optinToken(signer: Account, symbol: string): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve, reject) => {
//             try {
//                 //Get Token
//                 const token = BridgeTokens.get("algorand", symbol);
//                 if (!token) throw new Error(AlgoError.INVALID_ASSET);

//                 //Fail Safe
//                 if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
//                 if (!token.address) throw new Error(AlgoError.INVALID_ASSET_ID);
//                 if (typeof token.address !== "number") throw new Error(AlgoError.INVALID_ASSET_ID_TYPE);

//                 //Get Txn
//                 console.log(`Opting in ${signer.addr} to ${token.address}`);
//                 const transactions: Transaction[] = [];
//                 const txn = await this._transactions.optinTransaction(signer.addr, token.address);
//                 transactions.push(txn);

//                 //Send Txn
//                 await this.signAndSend_SingleSigner(transactions, signer);
//                 console.log(`Optin Completed`);
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     /**
//      *
//      * @method OptedinAccountExists
//      * @param address
//      * @param asset
//      * @returns {Promise<boolean>}
//      */
//     async OptedinAccountExists(address: string, asset: string): Promise<boolean> {
//         if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
//         console.log(`Checking if ${address} has opted in to ${asset}...`);
//         console.log("Not Implemented Yet");

//         await this._client.accountInformation(address).query;
//         return true;
//     }

//     /**
//      * Closes out token account
//      * @param signer
//      * @param receiver
//      * @param symbol
//      * @returns out token account
//      */
//     async closeOutTokenAccount(signer: Account, receiver: string, symbol: string): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve, reject) => {
//             try {
//                 //Get Token
//                 const token = BridgeTokens.get("algorand", symbol);
//                 if (!token) throw new Error(AlgoError.INVALID_ASSET);

//                 //Fail Safe
//                 if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
//                 if (!token.address) throw new Error(AlgoError.INVALID_ASSET_ID);
//                 if (typeof token.address !== "number") throw new Error(AlgoError.INVALID_ASSET_ID_TYPE);

//                 //Get Txns
//                 console.log(`Closing out token account for ${signer.addr} to ${receiver}`);
//                 const transactions: Transaction[] = [];
//                 const txn = await this._transactions.closeOutTokenTransaction(signer.addr, receiver, token.address);
//                 transactions.push(txn);

//                 //Send Txn
//                 await this.signAndSend_SingleSigner(transactions, signer);
//                 console.log(`Token Closeout Completed`);
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     /**
//      *
//      * Closes out account
//      * @param signer
//      * @param receiver
//      * @returns
//      */
//     async closeOutAccount(signer: AlgorandAccount, receiver: string): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve, reject) => {
//             try {
//                 //Fail Safe
//                 if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);

//                 //Get txns
//                 console.log(`Closing out token account for ${signer.addr} to ${receiver}`);
//                 const transactions: Transaction[] = [];
//                 const txn = await this._transactions.closeOutAccountTransaction(signer.addr, receiver);
//                 transactions.push(txn);

//                 //Send Txn
//                 await this.signAndSend_SingleSigner(transactions, signer);
//                 console.log(`Closeout Completed`);
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     /**
//      *
//      * @param transactions
//      * @param signer
//      * @returns
//      */
//     async signAndSendTransactions(
//         transactions: Transaction[],
//         signer: Account
//     ): Promise<SendRawTransaction> {
//         if (transactions.length == 0) throw new Error("Transactions array should contain one or more transactions.");
//         if (transactions.length > 4) throw new Error("Maximum of 4 transactions can be sent at a time.");

//         const signedTxns: Uint8Array[] = [];
//         const groupID = algosdk.computeGroupID(transactions);

//         for (let i = 0; i < transactions.length; i++) {
//             transactions[i].group = groupID;
//             const signedTxn: Uint8Array = transactions[i].signTxn(signer.sk);
//             signedTxns.push(signedTxn);
//         }

//         const txnResult: SendRawTransaction = await this.client.sendRawTransaction(signedTxns).do();
//         await algosdk.waitForConfirmation(this.client, transactions[0].txID().toString(), 4);
//         return txnResult
//     }

//     /**
//      *
//      * @param rawsignedTxns
//      * @returns
//      */
//     async sendSignedTransaction(rawsignedTxns: Uint8Array[]): Promise<SendRawTransaction> {
//         const txnResult = await this.client.sendRawTransaction(rawsignedTxns).do();
//         await algosdk.waitForConfirmation(this.client, txnResult, 4);
//         return txnResult;
//     }

//     /**
//      *
//      * Signs and send multi sig
//      * @param groupedTxns
//      * @param signers
//      * @param mParams
//      * @param [debug_rootPath]
//      * @returns
//      */
//     async signAndSend_MultiSig(
//         groupedTxns: Transaction[],
//         signers: Account[],
//         mParams: algosdk.MultisigMetadata,
//         debug_rootPath?: string
//     ): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve, reject) => {
//             try {
//                 //Fail Safe
//                 if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

//                 //Check signers
//                 if (signers.length == 0) throw new Error("No Signers");
//                 signers.forEach((signer) => {
//                     if (!signer) throw new Error(AlgoError.INVALID_SIGNER);
//                     if (!signer.sk) throw new Error(AlgoError.MISSING_SECRET_KEY);
//                 });

//                 //Check Txns
//                 if (groupedTxns.length == 0) throw new Error("No Transactions to sign");
//                 if (groupedTxns.length > 4) throw new Error("Maximum 4 Transactions in a group");

//                 const signedTxns: Uint8Array[] = [];
//                 const groupID = algosdk.computeGroupID(groupedTxns);

//                 for (let i = 0; i < groupedTxns.length; i++) {
//                     groupedTxns[i].group = groupID;

//                     let signedTxn: Uint8Array = algosdk.signMultisigTransaction(
//                         groupedTxns[i],
//                         mParams,
//                         signers[0].sk
//                     ).blob;
//                     for (let j = 1; j < signers.length; j++) {
//                         signedTxn = algosdk.appendSignMultisigTransaction(signedTxn, mParams, signers[j].sk).blob;
//                     }
//                     signedTxns.push(signedTxn);
//                 }

//                 if (debug_rootPath) {
//                     console.log(`Creating Dryrun at ${debug_rootPath}`);
//                     await this.createDryrun(signedTxns, debug_rootPath);
//                 }

//                 //Prep and Send Transactions
//                 console.log("------------------------------");
//                 const txnResult = await this._client.sendRawTransaction(signedTxns).do();
//                 await algosdk.waitForConfirmation(this._client, groupedTxns[0].txID().toString(), 4);
//                 console.log("------------------------------");
//                 console.log("Group Transaction ID: " + txnResult.txId);
//                 for (let i = 0; i < groupedTxns.length; i++) {
//                     const txnID = groupedTxns[i].txID().toString();
//                     console.log("Transaction " + i + ": " + txnID);
//                 }
//                 console.log("------------------------------");
//                 resolve(true);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//     }

//     /**
//      *
//      * Creates dryrun
//      * @param rawSignedTxnBuff
//      * @param [rootPath]
//      * @returns
//      */
//     async createDryrun(rawSignedTxnBuff: Uint8Array[], rootPath?: string): Promise<boolean> {
//         // eslint-disable-next-line no-async-promise-executor
//         return new Promise(async (resolve) => {
//             try {
//                 //Fail Safe
//                 if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

//                 //Make sure root path is defined
//                 if (!rootPath) resolve(false);

//                 let dryRun: any = null;

//                 const txnsDecoded = rawSignedTxnBuff.map((txn) => {
//                     return algosdk.decodeSignedTransaction(txn);
//                 });

//                 dryRun = await algosdk.createDryrun({
//                     client: this._client,
//                     txns: txnsDecoded,
//                 });

//                 console.log(rootPath + "/tests/debug/algodebug.msgp");
//                 await fs.writeFile(
//                     rootPath + "/tests/debug/algodebug.msgp",
//                     algosdk.encodeObj(dryRun.get_obj_for_encoding(true)),
//                     (error: NodeJS.ErrnoException | null) => {
//                         if (error) throw error;
//                     }
//                 );

//                 resolve(true);
//             } catch (error) {
//                 console.log(error);
//                 resolve(false);
//             }
//         });
//     }

//     /**
//      *
//      * Gets balance
//      * @param address
//      * @returns balance
//      */
//     public async getBalance(address: string): Promise<number> {
//         if (!this._accounts) throw new Error(AlgoError.UNDEFINED_ACCOUNTS);
//         const balance = await this._accounts.getBalance(address);

//         return balance;
//     }

//     /**
//      *
//      * Waits for balance
//      * @param address
//      * @param expectedAmount
//      * @param [timeoutSeconds]
//      * @param [threshold]
//      * @param [anybalance]
//      * @param [noBalance]
//      * @returns
//      */
//     public async waitForBalance(
//         address: string,
//         expectedAmount: number,
//         timeoutSeconds = 60,
//         threshold = 0.001,
//         anybalance = false,
//         noBalance = false
//     ): Promise<number> {
//         //Get start time & balance
//         const start = Date.now();
//         let balance = await this.getBalance(address);

//         //Loop until balance (or timeout) is reached
//         for (let i = 0; i <= timeoutSeconds; i++) {
//             //Check break conditions
//             if (anybalance && balance > 0) {
//                 break;
//             } else if (noBalance && balance == 0) {
//                 break;
//             } else if (Math.abs(balance - expectedAmount) < threshold) {
//                 break;
//             }

//             //Log
//             const timeInSeconds = (Date.now() - start) / 1000;
//             LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

//             //Check timeout
//             if (Date.now() - start > timeoutSeconds * 1000) {
//                 throw new Error(AlgoError.TIMEOUT);
//             }

//             //Wait and Check balance
//             await Sleep(1000);
//             balance = await this.getBalance(address);
//         }

//         //Log
//         const timeInSeconds = (Date.now() - start) / 1000;
//         LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

//         return balance;
//     }

//     /**
//      *
//      * Waits for min balance
//      * @param address
//      * @param minAmount
//      * @param [timeoutSeconds]
//      * @returns for min balance
//      */
//     public async waitForMinBalance(address: string, minAmount: number, timeoutSeconds = 60): Promise<number> {
//         //Get start time & balance
//         const start = Date.now();
//         let balance = await this.getBalance(address);

//         //Loop until balance (or timeout) is reached
//         for (let i = 0; i <= timeoutSeconds; i++) {
//             //Check break conditions
//             if (balance >= minAmount) {
//                 break;
//             }

//             //Log
//             const timeInSeconds = (Date.now() - start) / 1000;
//             LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

//             //Check timeout
//             if (Date.now() - start > timeoutSeconds * 1000) {
//                 throw new Error(AlgoError.TIMEOUT);
//             }

//             //Wait and Check balance
//             await Sleep(1000);
//             balance = await this.getBalance(address);
//         }

//         //Log
//         const timeInSeconds = (Date.now() - start) / 1000;
//         LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

//         return balance;
//     }

//     /**
//      *
//      * Waits for balance change
//      * @param address
//      * @param startingAmount
//      * @param [timeoutSeconds]
//      * @returns for balance change
//      */
//     public async waitForBalanceChange(address: string, startingAmount: number, timeoutSeconds = 60): Promise<number> {
//         //Get start time & balance
//         const start = Date.now();
//         let balance = await this.getBalance(address);

//         //Loop until balance (or timeout) is reached
//         for (let i = 0; i <= timeoutSeconds; i++) {
//             //Check break conditions
//             if (balance != startingAmount) {
//                 break;
//             }

//             //Log
//             const timeInSeconds = (Date.now() - start) / 1000;
//             LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

//             //Check timeout
//             if (Date.now() - start > timeoutSeconds * 1000) {
//                 throw new Error(AlgoError.TIMEOUT);
//             }

//             //Wait and Check balance
//             await Sleep(1000);
//             balance = await this.getBalance(address);
//         }

//         //Log
//         const timeInSeconds = (Date.now() - start) / 1000;
//         LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

//         return balance;
//     }

//     /**
//      *
//      * Gets token balance
//      * @param address
//      * @param symbol
//      * @returns
//      */
//     public async getTokenBalance(address: string, symbol: string): Promise<number> {
//         if (!this._accounts) throw new Error(AlgoError.UNDEFINED_ACCOUNTS);

//         //Get Token
//         const token = BridgeTokens.get("algorand", symbol);
//         if (!token) throw new Error(AlgoError.INVALID_ASSET);
//         if (!token.address) throw new Error(AlgoError.INVALID_ASSET_ID);
//         if (typeof token.address !== "number") throw new Error(AlgoError.INVALID_ASSET_ID_TYPE);

//         //Get Token Balance
//         const balance = await this._accounts.getTokensHeld(address, token);
//         return balance;
//     }

//     /**
//      *
//      * Waits for token balance
//      * @param address
//      * @param symbol
//      * @param expectedAmount
//      * @param [timeoutSeconds]
//      * @param [threshold]
//      * @param [anybalance]
//      * @param [noBalance]
//      * @returns for token balance
//      */
//     public async waitForTokenBalance(
//         address: string,
//         symbol: string,
//         expectedAmount: number,
//         timeoutSeconds = 60,
//         threshold = 0.001,
//         anybalance = false,
//         noBalance = false
//     ): Promise<number> {
//         //Get start time & balance
//         const start = Date.now();
//         let balance = await this.getTokenBalance(address, symbol);

//         //Loop until balance (or timeout) is reached
//         for (let i = 0; i <= timeoutSeconds; i++) {
//             //Check break conditions
//             if (anybalance && balance > 0) {
//                 break;
//             } else if (noBalance && balance == 0) {
//                 break;
//             } else if (Math.abs(balance - expectedAmount) < threshold) {
//                 break;
//             }

//             //Log
//             const timeInSeconds = (Date.now() - start) / 1000;
//             LogProgress(
//                 `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
//             );

//             //Check timeout
//             if (Date.now() - start > timeoutSeconds * 1000) {
//                 throw new Error("Timeout waiting for balance");
//             }

//             //Wait and Check balance
//             await Sleep(1000);
//             balance = await this.getTokenBalance(address, symbol);
//         }

//         //Final Log
//         const timeInSeconds = (Date.now() - start) / 1000;
//         LogProgress(
//             `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
//         );

//         return balance;
//     }

//     /**
//      *
//      *
//      * Waits for min token balance
//      * @param address
//      * @param symbol
//      * @param minAmount
//      * @param [timeoutSeconds]
//      * @returns for min token balance
//      */
//     public async waitForMinTokenBalance(
//         address: string,
//         symbol: string,
//         minAmount: number,
//         timeoutSeconds = 60
//     ): Promise<number> {
//         //Get start time & balance
//         const start = Date.now();
//         let balance = await this.getTokenBalance(address, symbol);

//         //Loop until balance (or timeout) is reached
//         for (let i = 0; i <= timeoutSeconds; i++) {
//             //Check break conditions
//             if (balance >= minAmount) {
//                 break;
//             }

//             //Log
//             const timeInSeconds = (Date.now() - start) / 1000;
//             LogProgress(
//                 `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
//             );

//             //Check timeout
//             if (Date.now() - start > timeoutSeconds * 1000) {
//                 throw new Error("Timeout waiting for balance");
//             }

//             //Wait and Check balance
//             await Sleep(1000);
//             balance = await this.getTokenBalance(address, symbol);
//         }

//         //Final Log
//         const timeInSeconds = (Date.now() - start) / 1000;
//         LogProgress(
//             `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
//         );

//         return balance;
//     }

//     /**
//      *
//      * Waits for token balance change
//      * @param address
//      * @param symbol
//      * @param startingAmount
//      * @param [timeoutSeconds]
//      * @returns for token balance change
//      */
//     public async waitForTokenBalanceChange(
//         address: string,
//         symbol: string,
//         startingAmount: number,
//         timeoutSeconds = 60
//     ): Promise<number> {
//         //Get start time & balance
//         const start = Date.now();
//         let balance = await this.getTokenBalance(address, symbol);

//         //Loop until balance (or timeout) is reached
//         for (let i = 0; i <= timeoutSeconds; i++) {
//             //Check break conditions
//             if (balance != startingAmount) {
//                 break;
//             }

//             //Log
//             const timeInSeconds = (Date.now() - start) / 1000;
//             LogProgress(
//                 `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
//             );

//             //Check timeout
//             if (Date.now() - start > timeoutSeconds * 1000) {
//                 throw new Error("Timeout waiting for balance");
//             }

//             //Wait and Check balance
//             await Sleep(1000);
//             balance = await this.getTokenBalance(address, symbol);
//         }

//         //Final Log
//         const timeInSeconds = (Date.now() - start) / 1000;
//         LogProgress(
//             `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
//         );

//         return balance;
//     }

//     /**
//      *
//      *
//      * @method getAlgorandBridgeAddress
//      * @param id
//      * @returns {string |number|undefined}
//      */
//     public getAlgorandBridgeAddress(id: AlgorandProgramAccount): string | number | undefined {
//         return this._bridgeTxnsV1?.getGlitterAccountAddress(id);
//     }
//     public getTxnHashedFromBase64(txnID: string): string {
//         return ethers.utils.keccak256(base64To0xString(txnID));
//     }

//     public get tokenBridgePollerAddress(): string | number | undefined {
//         return this._config?.accounts?.bridge;
//     }
//     public get tokenBridgeAppID(): number | undefined {
//         return this._config?.appProgramId;
//     }
//     public get tokenBridgeAlgoVault(): string | number | undefined {
//         return this._config?.accounts?.algoVault;
//     }
//     public get usdcBridgePollerAddress(): string | number | undefined {
//         return this._config?.accounts?.usdcDeposit;
//     }
//     public get usdcBridgeDepositAddress(): string | number | undefined {
//         return this._config?.accounts?.usdcDeposit;
//     }
//     public get usdcBridgeReceiverAddress(): string | number | undefined {
//         return this._config?.accounts?.usdcReceiver;
//     }
//     public get usdcBridgeFeeReceiver(): string | number | undefined {
//         return this._config?.accounts?.feeReceiver;
//     }
//     public getAssetID(symbol: string): number | undefined {
//         try {
//             if (!this._accounts) throw new Error("Algorand Accounts not defined");

//             //Get Token
//             const token = BridgeTokens.get("algorand", symbol);
//             if (!token) throw new Error("Token not found");
//             if (!token.address) throw new Error("mint address is required");
//             if (typeof token.address !== "number") throw new Error("token address is required in number format");
//             return token.address;
//         } catch (error) {
//             console.log(error);
//             return undefined;
//         }
//     }
//     public getToken(token: string): BridgeToken | undefined {
//         return BridgeTokens.get("algorand", token);
//     }

//     getAlgodIndexer(): algosdk.Indexer {
//         const indexer = new algosdk.Indexer(this.config.indexerUrl, this.config.indexerUrl, this.config.nativeTokenSymbol)
//         indexer.setIntEncoding(algosdk.IntDecoding.MIXED)
//         return indexer
//     }

//     getAlgodClient(): algosdk.Algodv2 {
//         const client = new algosdk.Algodv2(this.config.serverUrl, this.config.serverPort.toString(), this.config.nativeTokenSymbol);
//         client.setIntEncoding(algosdk.IntDecoding.MIXED);
//         return client;
//     }
// }
