import * as algosdk from "algosdk";
import { Account, Transaction } from "algosdk";
import { AlgorandAccount, AlgorandAccounts } from "./accounts";
import { AlgorandConfig, AlgorandProgramAccount } from "./config";
import { AlgorandTxns } from "./txns/txns";
import { AlgorandAssets } from "./assets";
import { AlgorandBridgeTxnsV1 } from "./txns/bridge";
import * as fs from "fs";
import { BridgeToken, BridgeTokens, LogProgress, Routing, RoutingDefault, Sleep } from "../../common";
import { ethers } from "ethers";
import { base64To0xString } from "../../common/utils/utils";
import { AlgoError } from "./algoError";

/**
 *
 * Algorand connect
 */
export class AlgorandConnect {
    private _clientIndexer: algosdk.Indexer | undefined = undefined;
    private _client: algosdk.Algodv2 | undefined = undefined;
    private _accounts: AlgorandAccounts | undefined = undefined;
    private _assets: AlgorandAssets | undefined = undefined;
    private _transactions: AlgorandTxns | undefined = undefined;
    private _bridgeTxnsV1: AlgorandBridgeTxnsV1 | undefined = undefined;
    private _config: AlgorandConfig | undefined = undefined;
    _lastTxnHash = "";

    constructor(config: AlgorandConfig) {
        this._config = config;
        this._client = GetAlgodClient(config.serverUrl, config.serverPort, config.nativeToken);
        this._clientIndexer = GetAlgodIndexer(config.indexerUrl, config.indexerUrl, config.nativeToken);
        this._accounts = new AlgorandAccounts(this._client);
        this._assets = new AlgorandAssets(this._client);
        this._transactions = new AlgorandTxns(this._client, config.accounts);
        this._bridgeTxnsV1 = new AlgorandBridgeTxnsV1(
            this._client,
            config.appProgramId,
            this._transactions,
            config.accounts
        );

        //Load tokens
        config.tokens.forEach((element) => {
            BridgeTokens.add(element);
        });
    }

    //Getters
    public get client() {
        return this._client;
    }
    public get clientIndexer() {
        return this._clientIndexer;
    }
    public get accounts() {
        return this._accounts;
    }
    public get assets() {
        return this._assets;
    }

    //Check
    public async checkHealth(): Promise<object> {
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
        const returnValue = await this._client.healthCheck().do();
        return returnValue;
    }
    public async checkVersion(): Promise<object> {
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
        const returnValue = await this._client.versionsCheck().do();
        return returnValue;
    }

    /**
     *
     * @param fromAddress
     * @param fromSymbol
     * @param toNetwork
     * @param toAddress
     * @param tosymbol
     * @param amount
     * @returns {Promise<algosdk.Transaction[]>}
     */
    public async bridgeTransaction(
        fromAddress: string,
        fromSymbol: string,
        toNetwork: string,
        toAddress: string,
        tosymbol: string,
        amount: number
    ): Promise<algosdk.Transaction[]> {
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
        if (!this._bridgeTxnsV1) throw new Error(AlgoError.BRIDGE_NOT_SET);

        //Get Token
        const asset = BridgeTokens.get("algorand", fromSymbol);
        // ?? asset should be xsol
        if (!asset) throw new Error(AlgoError.INVALID_ASSET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = fromAddress;
        routing.from.token = fromSymbol;
        routing.from.network = "algorand";

        routing.to.address = toAddress;
        routing.to.token = tosymbol;
        routing.to.network = toNetwork;
        routing.amount = amount;

        let transaction: Transaction[];

        if (asset.symbol.toLocaleLowerCase() == "usdc" && routing.to.token.toLocaleLowerCase() == "usdc") {
            transaction = await this._bridgeTxnsV1.HandleUsdcSwap(routing);
        } else {
            transaction = await this._bridgeTxnsV1.bridgeTransactions(routing, asset);
        }

        return transaction;
    }

    /**
     * @method bridge
     * @param account
     * @param fromSymbol
     * @param toNetwork
     * @param toAddress
     * @param tosymbol
     * @param amount
     * @returns {Promise<boolean>}
     */
    public async bridge(
        account: AlgorandAccount,
        fromSymbol: string,
        toNetwork: string,
        toAddress: string,
        tosymbol: string,
        amount: number
    ): Promise<boolean> {
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
        if (!this._bridgeTxnsV1) throw new Error(AlgoError.BRIDGE_NOT_SET);

        //Get Token
        const asset = BridgeTokens.get("algorand", fromSymbol);
        if (!asset) throw new Error(AlgoError.INVALID_ASSET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = account.addr;
        routing.from.token = fromSymbol;
        routing.from.network = "algorand";

        routing.to.address = toAddress;
        routing.to.token = tosymbol;
        routing.to.network = toNetwork;
        routing.amount = amount;

        //Run Transaction
        let transaction: Transaction[];

        if (asset.symbol.toLocaleLowerCase() == "usdc" && routing.to.token.toLocaleLowerCase() == "usdc") {
            transaction = await this._bridgeTxnsV1.HandleUsdcSwap(routing);
        } else {
            transaction = await this._bridgeTxnsV1.bridgeTransactions(routing, asset);
        }

        await this.signAndSend_SingleSigner(transaction, account);
        console.log(`Algorand Bridge Transaction Complete`);

        return true;
    }

    /**
     *
     *
     * @method fundAccount
     * @param funder
     * @param account
     * @param amount
     * @returns {Promise<boolean>}
     */
    public async fundAccount(funder: AlgorandAccount, account: AlgorandAccount, amount: number): Promise<boolean> {
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = funder.addr;
        routing.from.token = "algo";
        routing.from.network = "algorand";

        routing.to.address = account.addr;
        routing.to.token = "algo";
        routing.to.network = "algorand";

        routing.amount = amount;

        const returnValue = await this.sendAlgo(routing, funder);
        return returnValue;
    }

    /**
     *
     * @method fundAccountToken
     * @param funder
     * @param account
     * @param amount
     * @param symbol
     * @returns {Promise<boolean>}
     */
    public async fundAccountToken(
        funder: AlgorandAccount,
        account: AlgorandAccount,
        amount: number,
        symbol: string
    ): Promise<boolean> {
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

        //Get Token
        const asset = BridgeTokens.get("algorand", symbol);
        if (!asset) throw new Error(AlgoError.INVALID_ASSET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = funder.addr;
        routing.from.token = symbol;
        routing.from.network = "algorand";

        routing.to.address = account.addr;
        routing.to.token = symbol;
        routing.to.network = "algorand";

        routing.amount = amount;

        const returnValue = await this.sendTokens(routing, funder, asset);
        return returnValue;
    }

    /**
     * @method sendAlgo
     * @param routing
     * @param signer
     * @param debug_rootPath
     * @returns {Promise<boolean>}
     */
    async sendAlgo(routing: Routing, signer: Account, debug_rootPath?: string): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
                if (!signer) throw new Error(AlgoError.INVALID_SIGNER);

                //Get Txns
                const transactions: Transaction[] = [];
                transactions.push(await this._transactions.sendAlgoTransaction(routing));

                //Send
                await this.signAndSend_SingleSigner(transactions, signer, debug_rootPath);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * @method sendTokens
     * @param routing
     * @param signer
     * @param token
     * @param debug_rootPath
     * @returns  {Promise<boolean>}
     */
    async sendTokens(routing: Routing, signer: Account, token: BridgeToken, debug_rootPath?: string): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
                if (!signer) throw new Error(AlgoError.INVALID_SIGNER);

                //Get Txn
                console.log(
                    `Sending ${routing.amount} ${token.symbol} from ${routing.from.address} to ${routing.to.address}`
                );
                const transactions: Transaction[] = [];
                transactions.push(await this._transactions.sendTokensTransaction(routing, token));

                //Send
                await this.signAndSend_SingleSigner(transactions, signer, debug_rootPath);
                console.log(`Txn Completed`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * @method mintTokens
     * @param signers
     * @param msigParams
     * @param routing
     * @param token
     * @param debug_rootPath
     * @returns {Promise<boolean>}
     */
    async mintTokens(
        signers: Account[],
        msigParams: algosdk.MultisigMetadata,
        routing: Routing,
        token: BridgeToken,
        debug_rootPath?: string
    ): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);

                //Get Txn
                console.log(`Minting ${routing.amount} ${token.symbol} to ${routing.to.address}`);
                const transactions: Transaction[] = [];
                transactions.push(await this._transactions.sendTokensTransaction(routing, token));

                //Send
                await this.signAndSend_MultiSig(transactions, signers, msigParams, debug_rootPath);
                console.log("Minting Completed");
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * @method optinToken
     * @param signer
     * @param symbol
     * @returns {Promise<boolean>}
     */
    async optinToken(signer: Account, symbol: string): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Get Token
                const token = BridgeTokens.get("algorand", symbol);
                if (!token) throw new Error(AlgoError.INVALID_ASSET);

                //Fail Safe
                if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
                if (!token.address) throw new Error(AlgoError.INVALID_ASSET_ID);
                if (typeof token.address !== "number") throw new Error(AlgoError.INVALID_ASSET_ID_TYPE);

                //Get Txn
                console.log(`Opting in ${signer.addr} to ${token.address}`);
                const transactions: Transaction[] = [];
                const txn = await this._transactions.optinTransaction(signer.addr, token.address);
                transactions.push(txn);

                //Send Txn
                await this.signAndSend_SingleSigner(transactions, signer);
                console.log(`Optin Completed`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * @method OptedinAccountExists
     * @param address
     * @param asset
     * @returns {Promise<boolean>}
     */
    async OptedinAccountExists(address: string, asset: string): Promise<boolean> {
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
        console.log(`Checking if ${address} has opted in to ${asset}...`);
        console.log("Not Implemented Yet");

        await this._client.accountInformation(address).query;
        return true;
    }

    /**
     * Closes out token account
     * @param signer
     * @param receiver
     * @param symbol
     * @returns out token account
     */
    async closeOutTokenAccount(signer: Account, receiver: string, symbol: string): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Get Token
                const token = BridgeTokens.get("algorand", symbol);
                if (!token) throw new Error(AlgoError.INVALID_ASSET);

                //Fail Safe
                if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
                if (!token.address) throw new Error(AlgoError.INVALID_ASSET_ID);
                if (typeof token.address !== "number") throw new Error(AlgoError.INVALID_ASSET_ID_TYPE);

                //Get Txns
                console.log(`Closing out token account for ${signer.addr} to ${receiver}`);
                const transactions: Transaction[] = [];
                const txn = await this._transactions.closeOutTokenTransaction(signer.addr, receiver, token.address);
                transactions.push(txn);

                //Send Txn
                await this.signAndSend_SingleSigner(transactions, signer);
                console.log(`Token Closeout Completed`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * Closes out account
     * @param signer
     * @param receiver
     * @returns
     */
    async closeOutAccount(signer: AlgorandAccount, receiver: string): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);

                //Get txns
                console.log(`Closing out token account for ${signer.addr} to ${receiver}`);
                const transactions: Transaction[] = [];
                const txn = await this._transactions.closeOutAccountTransaction(signer.addr, receiver);
                transactions.push(txn);

                //Send Txn
                await this.signAndSend_SingleSigner(transactions, signer);
                console.log(`Closeout Completed`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * Signs and send single signer
     * @param groupedTxns
     * @param signer
     * @param [debug_rootPath]
     * @returns
     */
    async signAndSend_SingleSigner(
        groupedTxns: Transaction[],
        signer: Account,
        debug_rootPath?: string
    ): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
                if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
                if (!signer) throw new Error(AlgoError.INVALID_SIGNER);
                if (!signer.sk) throw new Error(AlgoError.MISSING_SECRET_KEY);

                //Check Txns
                if (groupedTxns.length == 0) throw new Error("No Transactions to sign");
                if (groupedTxns.length > 4) throw new Error("Maximum 4 Transactions in a group");

                const signedTxns: Uint8Array[] = [];
                const groupID = algosdk.computeGroupID(groupedTxns);

                for (let i = 0; i < groupedTxns.length; i++) {
                    groupedTxns[i].group = groupID;
                    const signedTxn: Uint8Array = groupedTxns[i].signTxn(signer.sk);
                    signedTxns.push(signedTxn);
                }

                if (debug_rootPath) {
                    await this.createDryrun(signedTxns, debug_rootPath);
                }

                //Prep and Send Transactions
                console.log("------------------------------");
                const txnResult = await this._client.sendRawTransaction(signedTxns).do();
                await algosdk.waitForConfirmation(this._client, groupedTxns[0].txID().toString(), 4);
                console.log("------------------------------");
                console.log("Group Transaction ID: " + txnResult.txId);
                for (let i = 0; i < groupedTxns.length; i++) {
                    const txnID = groupedTxns[i].txID().toString();
                    console.log("Transaction " + i + ": " + txnID);
                }
                console.log("------------------------------");

                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * Sends signed transaction
     * @param rawsignedTxns
     * @param [debug_rootPath]
     * @returns signed transaction
     */
    async sendSignedTransaction(rawsignedTxns: Uint8Array[], debug_rootPath?: string): Promise<boolean> {
        //Fail Safe
        if (!this._transactions) throw new Error(AlgoError.UNDEFINED_TRANSACTION);
        if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
        if (debug_rootPath) {
            await this.createDryrun(rawsignedTxns, debug_rootPath);
        }
        const txnResult = await this._client.sendRawTransaction(rawsignedTxns).do();
        await algosdk.waitForConfirmation(this._client, txnResult, 4); // why 4?
        console.log("Group Transaction ID: " + txnResult.txId);

        return true;
    }

    /**
     *
     * Signs and send multi sig
     * @param groupedTxns
     * @param signers
     * @param mParams
     * @param [debug_rootPath]
     * @returns
     */
    async signAndSend_MultiSig(
        groupedTxns: Transaction[],
        signers: Account[],
        mParams: algosdk.MultisigMetadata,
        debug_rootPath?: string
    ): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

                //Check signers
                if (signers.length == 0) throw new Error("No Signers");
                signers.forEach((signer) => {
                    if (!signer) throw new Error(AlgoError.INVALID_SIGNER);
                    if (!signer.sk) throw new Error(AlgoError.MISSING_SECRET_KEY);
                });

                //Check Txns
                if (groupedTxns.length == 0) throw new Error("No Transactions to sign");
                if (groupedTxns.length > 4) throw new Error("Maximum 4 Transactions in a group");

                const signedTxns: Uint8Array[] = [];
                const groupID = algosdk.computeGroupID(groupedTxns);

                for (let i = 0; i < groupedTxns.length; i++) {
                    groupedTxns[i].group = groupID;

                    let signedTxn: Uint8Array = algosdk.signMultisigTransaction(
                        groupedTxns[i],
                        mParams,
                        signers[0].sk
                    ).blob;
                    for (let j = 1; j < signers.length; j++) {
                        signedTxn = algosdk.appendSignMultisigTransaction(signedTxn, mParams, signers[j].sk).blob;
                    }
                    signedTxns.push(signedTxn);
                }

                if (debug_rootPath) {
                    console.log(`Creating Dryrun at ${debug_rootPath}`);
                    await this.createDryrun(signedTxns, debug_rootPath);
                }

                //Prep and Send Transactions
                console.log("------------------------------");
                const txnResult = await this._client.sendRawTransaction(signedTxns).do();
                await algosdk.waitForConfirmation(this._client, groupedTxns[0].txID().toString(), 4);
                console.log("------------------------------");
                console.log("Group Transaction ID: " + txnResult.txId);
                for (let i = 0; i < groupedTxns.length; i++) {
                    const txnID = groupedTxns[i].txID().toString();
                    console.log("Transaction " + i + ": " + txnID);
                }
                console.log("------------------------------");
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * Creates dryrun
     * @param rawSignedTxnBuff
     * @param [rootPath]
     * @returns
     */
    async createDryrun(rawSignedTxnBuff: Uint8Array[], rootPath?: string): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

                //Make sure root path is defined
                if (!rootPath) resolve(false);

                let dryRun: any = null;

                const txnsDecoded = rawSignedTxnBuff.map((txn) => {
                    return algosdk.decodeSignedTransaction(txn);
                });

                dryRun = await algosdk.createDryrun({
                    client: this._client,
                    txns: txnsDecoded,
                });

                console.log(rootPath + "/tests/debug/algodebug.msgp");
                await fs.writeFile(
                    rootPath + "/tests/debug/algodebug.msgp",
                    algosdk.encodeObj(dryRun.get_obj_for_encoding(true)),
                    (error: NodeJS.ErrnoException | null) => {
                        if (error) throw error;
                    }
                );

                resolve(true);
            } catch (error) {
                console.log(error);
                resolve(false);
            }
        });
    }

    /**
     *
     * Gets balance
     * @param address
     * @returns balance
     */
    public async getBalance(address: string): Promise<number> {
        if (!this._accounts) throw new Error(AlgoError.UNDEFINED_ACCOUNTS);
        const balance = await this._accounts.getBalance(address);

        return balance;
    }

    /**
     *
     * Waits for balance
     * @param address
     * @param expectedAmount
     * @param [timeoutSeconds]
     * @param [threshold]
     * @param [anybalance]
     * @param [noBalance]
     * @returns
     */
    public async waitForBalance(
        address: string,
        expectedAmount: number,
        timeoutSeconds = 60,
        threshold = 0.001,
        anybalance = false,
        noBalance = false
    ): Promise<number> {
        //Get start time & balance
        const start = Date.now();
        let balance = await this.getBalance(address);

        //Loop until balance (or timeout) is reached
        for (let i = 0; i <= timeoutSeconds; i++) {
            //Check break conditions
            if (anybalance && balance > 0) {
                break;
            } else if (noBalance && balance == 0) {
                break;
            } else if (Math.abs(balance - expectedAmount) < threshold) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error(AlgoError.TIMEOUT);
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getBalance(address);
        }

        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

        return balance;
    }

    /**
     *
     * Waits for min balance
     * @param address
     * @param minAmount
     * @param [timeoutSeconds]
     * @returns for min balance
     */
    public async waitForMinBalance(address: string, minAmount: number, timeoutSeconds = 60): Promise<number> {
        //Get start time & balance
        const start = Date.now();
        let balance = await this.getBalance(address);

        //Loop until balance (or timeout) is reached
        for (let i = 0; i <= timeoutSeconds; i++) {
            //Check break conditions
            if (balance >= minAmount) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error(AlgoError.TIMEOUT);
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getBalance(address);
        }

        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

        return balance;
    }

    /**
     *
     * Waits for balance change
     * @param address
     * @param startingAmount
     * @param [timeoutSeconds]
     * @returns for balance change
     */
    public async waitForBalanceChange(address: string, startingAmount: number, timeoutSeconds = 60): Promise<number> {
        //Get start time & balance
        const start = Date.now();
        let balance = await this.getBalance(address);

        //Loop until balance (or timeout) is reached
        for (let i = 0; i <= timeoutSeconds; i++) {
            //Check break conditions
            if (balance != startingAmount) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error(AlgoError.TIMEOUT);
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getBalance(address);
        }

        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(`$bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`);

        return balance;
    }

    /**
     *
     * Gets token balance
     * @param address
     * @param symbol
     * @returns
     */
    public async getTokenBalance(address: string, symbol: string): Promise<number> {
        if (!this._accounts) throw new Error(AlgoError.UNDEFINED_ACCOUNTS);

        //Get Token
        const token = BridgeTokens.get("algorand", symbol);
        if (!token) throw new Error(AlgoError.INVALID_ASSET);
        if (!token.address) throw new Error(AlgoError.INVALID_ASSET_ID);
        if (typeof token.address !== "number") throw new Error(AlgoError.INVALID_ASSET_ID_TYPE);

        //Get Token Balance
        const balance = await this._accounts.getTokensHeld(address, token);
        return balance;
    }

    /**
     *
     * Waits for token balance
     * @param address
     * @param symbol
     * @param expectedAmount
     * @param [timeoutSeconds]
     * @param [threshold]
     * @param [anybalance]
     * @param [noBalance]
     * @returns for token balance
     */
    public async waitForTokenBalance(
        address: string,
        symbol: string,
        expectedAmount: number,
        timeoutSeconds = 60,
        threshold = 0.001,
        anybalance = false,
        noBalance = false
    ): Promise<number> {
        //Get start time & balance
        const start = Date.now();
        let balance = await this.getTokenBalance(address, symbol);

        //Loop until balance (or timeout) is reached
        for (let i = 0; i <= timeoutSeconds; i++) {
            //Check break conditions
            if (anybalance && balance > 0) {
                break;
            } else if (noBalance && balance == 0) {
                break;
            } else if (Math.abs(balance - expectedAmount) < threshold) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(
                `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error("Timeout waiting for balance");
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getTokenBalance(address, symbol);
        }

        //Final Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
        );

        return balance;
    }

    /**
     *
     *
     * Waits for min token balance
     * @param address
     * @param symbol
     * @param minAmount
     * @param [timeoutSeconds]
     * @returns for min token balance
     */
    public async waitForMinTokenBalance(
        address: string,
        symbol: string,
        minAmount: number,
        timeoutSeconds = 60
    ): Promise<number> {
        //Get start time & balance
        const start = Date.now();
        let balance = await this.getTokenBalance(address, symbol);

        //Loop until balance (or timeout) is reached
        for (let i = 0; i <= timeoutSeconds; i++) {
            //Check break conditions
            if (balance >= minAmount) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(
                `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error("Timeout waiting for balance");
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getTokenBalance(address, symbol);
        }

        //Final Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
        );

        return balance;
    }

    /**
     *
     * Waits for token balance change
     * @param address
     * @param symbol
     * @param startingAmount
     * @param [timeoutSeconds]
     * @returns for token balance change
     */
    public async waitForTokenBalanceChange(
        address: string,
        symbol: string,
        startingAmount: number,
        timeoutSeconds = 60
    ): Promise<number> {
        //Get start time & balance
        const start = Date.now();
        let balance = await this.getTokenBalance(address, symbol);

        //Loop until balance (or timeout) is reached
        for (let i = 0; i <= timeoutSeconds; i++) {
            //Check break conditions
            if (balance != startingAmount) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(
                `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error("Timeout waiting for balance");
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getTokenBalance(address, symbol);
        }

        //Final Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `${symbol} bal. (${balance}), Timeout in ${Math.round((timeoutSeconds - timeInSeconds) * 10) / 10}s`
        );

        return balance;
    }

    /**
     *
     *
     * @method getAlgorandBridgeAddress
     * @param id
     * @returns {string |number|undefined}
     */
    public getAlgorandBridgeAddress(id: AlgorandProgramAccount): string | number | undefined {
        return this._bridgeTxnsV1?.getGlitterAccountAddress(id);
    }
    public getTxnHashedFromBase64(txnID: string): string {
        return ethers.utils.keccak256(base64To0xString(txnID));
    }

    public get tokenBridgePollerAddress(): string | number | undefined {
        return this._config?.accounts?.bridge;
    }
    public get tokenBridgeAppID(): number | undefined {
        return this._config?.appProgramId;
    }
    public get tokenBridgeAlgoVault(): string | number | undefined {
        return this._config?.accounts?.algoVault;
    }
    public get usdcBridgePollerAddress(): string | number | undefined {
        return this._config?.accounts?.usdcDeposit;
    }
    public get usdcBridgeDepositAddress(): string | number | undefined {
        return this._config?.accounts?.usdcDeposit;
    }
    public get usdcBridgeReceiverAddress(): string | number | undefined {
        return this._config?.accounts?.usdcReceiver;
    }
    public get usdcBridgeFeeReceiver(): string | number | undefined {
        return this._config?.accounts?.feeReceiver;
    }
    public get tokenBridge2AppID(): number | undefined {
        return this._config?.accounts?.tokenBridgeV2Id;
    }
    public getAssetID(symbol: string): number | undefined {
        try {
            if (!this._accounts) throw new Error("Algorand Accounts not defined");

            //Get Token
            const token = BridgeTokens.get("algorand", symbol);
            if (!token) throw new Error("Token not found");
            if (!token.address) throw new Error("mint address is required");
            if (typeof token.address !== "number") throw new Error("token address is required in number format");
            return token.address;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }
    public getToken(token: string): BridgeToken | undefined {
        return BridgeTokens.get("algorand", token);
    }
}

export const GetAlgodIndexer = (url: string, port: string | number, token = ""): algosdk.Indexer => {
    // const server = config.algo_client;
    // const port   = config.algo_port;
    console.log(`Connecting to Algorand Indexer at ${url}:${port}`);
    const indexer = new algosdk.Indexer(token, url, port);
    indexer.setIntEncoding(algosdk.IntDecoding.MIXED);
    return indexer;
};

export const GetAlgodClient = (url: string, port: string | number, token: string): algosdk.Algodv2 => {
    console.log(`Connecting to Algorand Client at ${url}:${port}`);
    const client = new algosdk.Algodv2(token, url, port);
    client.setIntEncoding(algosdk.IntDecoding.MIXED);
    return client;
};
