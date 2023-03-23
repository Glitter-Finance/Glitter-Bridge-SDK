import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";
import { SolanaAccount, SolanaAccounts } from "./accounts";
import { SolanaAssets } from "./assets";
import { SolanaBridgeTxnsV1 } from "./txns/bridge";
import { SolanaConfig, SolanaProgramId, SolanaPublicNetworks } from "./config";
import { SolanaTxns } from "./txns/txns";
import * as util from "util";
import {
    BridgeToken,
    BridgeTokens,
    LogProgress,
    Precise,
    Routing,
    RoutingDefault,
    Sleep,
    ValueUnits,
} from "../../common";
import { COMMITMENT } from "./utils";
import { ethers } from "ethers";
import base58 from "bs58";
import { SolanaError } from "./solanaError";

export class SolanaConnect {
    private _client?: Connection;
    private _accounts: SolanaAccounts | undefined = undefined;
    private _assets: SolanaAssets | undefined = undefined;
    private _transactions: SolanaTxns | undefined = undefined;
    private _bridgeTxnsV1: SolanaBridgeTxnsV1 | undefined = undefined;
    private _config: SolanaConfig | undefined = undefined;

    constructor(config: SolanaConfig) {
        this._config = config;
        this._client = new Connection(config.server);
        this._accounts = new SolanaAccounts(this._client);
        this._assets = new SolanaAssets(this._client);
        this._transactions = new SolanaTxns(this._client);
        this._bridgeTxnsV1 = new SolanaBridgeTxnsV1(
            this._client,
            config.accounts.bridgeProgram,
            config.accounts
        );

        //Load tokens
        config.tokens.forEach((element) => {
            BridgeTokens.add(element);
        });
    }

    public getPublicConnection(network: SolanaPublicNetworks): Connection {
        return new Connection(network.toString());
    }

    /**
   * @method bridgeTransactions
   * @param fromAddress
   * @param fromSymbol
   * @param toNetwork
   * @param toAddress
   * @param tosymbol
   * @param amount
   * @returns Unsigned bridge transaction
   * @description performs the bridge operation without signing transaction and return the undigned transaction instead
   */
    public async bridgeTransactions(
        fromAddress: string,
        fromSymbol: string,
        toNetwork: string,
        toAddress: string,
        tosymbol: string,
        amount: number
    ): Promise<Transaction | undefined> {
    //Fail Safe
        if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
        if (!this._bridgeTxnsV1) throw new Error(SolanaError.BRIDGE_NOT_SET);
        if (!this._accounts) throw new Error(SolanaError.ACCOUNTS_NOT_SET);
        if (!this._assets) throw new Error(SolanaError.ASSETS_NOT_SET);

        //Get Token
        const token = BridgeTokens.get("solana", fromSymbol);
        if (!token) throw new Error(SolanaError.INVALID_ASSET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = fromAddress;
        routing.from.token = fromSymbol;
        routing.from.network = "solana";

        routing.to.address = toAddress;
        routing.to.token = tosymbol;
        routing.to.network = toNetwork;
        routing.amount = amount;

        const sourcePubkey = new PublicKey(fromAddress);
        let txn: Transaction | undefined = undefined;
        if (token.symbol.toLowerCase() === "sol") {
            txn = await this._bridgeTxnsV1.solBridgeTransaction(
                sourcePubkey,
                routing,
                token
            );
        } else if (
            token.symbol.toLocaleLowerCase() == "usdc" &&
      tosymbol.toLocaleLowerCase() == "usdc"
        ) {
            txn = await this._bridgeTxnsV1.HandleUsdcSwapUnsigned(routing);
        } else {
            txn = await this._bridgeTxnsV1.tokenBridgeTransaction(
                sourcePubkey,
                routing,
                token
            );
        }
        return txn;
    }

    /**
   * @method bridge
   * @param account solana account of source
   * @param fromSymbol token symbol of source
   * @param toNetwork destination chain
   * @param toAddress address on destination chain
   * @param tosymbol destination token symbol
   * @param amount  amount to be transfered from source
   * @returns
   * @description performs the bridging operation between two chains
   */
    public async bridge(
        account: SolanaAccount,
        fromSymbol: string,
        toNetwork: string,
        toAddress: string,
        tosymbol: string,
        amount: number
    ) {
    //Fail Safe
        if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
        if (!this._bridgeTxnsV1) throw new Error(SolanaError.BRIDGE_NOT_SET);
        if (!this._accounts) throw new Error(SolanaError.ACCOUNTS_NOT_SET);
        if (!this._assets) throw new Error(SolanaError.ASSETS_NOT_SET);

        //Get Token
        const token = BridgeTokens.get("solana", fromSymbol);
        if (!token) throw new Error(SolanaError.INVALID_ASSET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = account.addr;
        routing.from.token = fromSymbol;
        routing.from.network = "solana";

        routing.to.address = toAddress;
        routing.to.token = tosymbol;
        routing.to.network = toNetwork;
        routing.amount = amount;

        //get token account
        let txn: Transaction | undefined = undefined;
        if (token.symbol.toLowerCase() === "sol") {
            txn = await this._bridgeTxnsV1.solBridgeTransaction(
                account.pk,
                routing,
                token
            );
        } else if (
            routing.to.token.toLocaleLowerCase() === "usdc" &&
      token.symbol.toLocaleLowerCase() === "usdc"
        ) {
            txn = await this._bridgeTxnsV1.HandleUsdcSwap(account, routing);
        } else {
            txn = await this._bridgeTxnsV1.tokenBridgeTransaction(
                account.pk,
                routing,
                token
            );
        }
        if (!txn) throw new Error(SolanaError.UNDEFINED_TRANSACTION);

        //Send Transaction
        const txid = await this._client.sendTransaction(
            txn,
            [Keypair.fromSecretKey(account.sk)],
            {
                skipPreflight: true,
                preflightCommitment: "processed",
            }
        );
        console.log(`   ✅ - Transaction sent to network ${txid}`);
        return true;
    }

    /**
   * @method fundAccount
   * @param funder
   * @param account
   * @param amount
   * @returns
   * @description transfers sol from funder to account
   */
    //Account Actions
    public async fundAccount(
        funder: SolanaAccount,
        account: SolanaAccount,
        amount: number
    ): Promise<boolean> {
    //Fail safe
        if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = funder.addr;
        routing.from.token = "sol";
        routing.from.network = "solana";

        routing.to.address = account.addr;
        routing.to.token = "sol";
        routing.to.network = "solana";

        routing.amount = amount;

        const returnValue = await this.sendSol(routing, funder);
        return returnValue;
    }

    /**
   * @method fundAccountToken
   * @param funder
   * @param account
   * @param amount
   * @param symbol
   * @returns
   * @description transfers given token from funder to account
   */
    public async fundAccountTokens(
        funder: SolanaAccount,
        account: SolanaAccount,
        amount: number,
        symbol: string
    ): Promise<boolean> {
    //Fail safe
        if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);

        //Get Token
        const token = BridgeTokens.get("solana", symbol);
        if (!token) throw new Error(SolanaError.INVALID_ASSET);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = funder.addr;
        routing.from.token = symbol;
        routing.from.network = "solana";

        routing.to.address = account.addr;
        routing.to.token = symbol;
        routing.to.network = "solana";

        routing.amount = amount;

        const returnValue = await this.sendTokens(routing, funder, token);
        return returnValue;
    }

    /**
   * @method closeOutAccount
   * @param signer
   * @param receiver
   * @returns
   */
    public async closeOutAccount(
        signer: SolanaAccount,
        receiver: SolanaAccount
    ): Promise<boolean> {
    //Fail Safe
        if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
        if (!this._transactions) throw new Error(SolanaError.UNDEFINED_TRANSACTION);
        if (!this._accounts) throw new Error(SolanaError.ACCOUNTS_NOT_SET);

        //Get balance
        const balance = await this.getBalance(signer.addr);

        //Get routing
        const routing = RoutingDefault();
        routing.from.address = signer.addr;
        routing.from.token = "sol";
        routing.from.network = "solana";

        routing.to.address = receiver.addr;
        routing.to.token = "sol";
        routing.to.network = "solana";

        //Get sol token
        const solToken = await this._transactions.SolToken;
        if (!solToken) throw new Error(SolanaError.SOL_TOKEN_NOT_SET);

        routing.amount = ValueUnits.fromUnits(BigInt(1), solToken.decimals).value;

        //get mock transaction
        const mock_txn = await this._transactions.sendSolTransaction(routing);
        mock_txn.recentBlockhash = (
            await this._client.getRecentBlockhash()
        ).blockhash;
        mock_txn.sign(...[SolanaAccounts.getSignerObject(signer)]);

        //get fee and set amount
        const feeUnits = await mock_txn.getEstimatedFee(this._client);

        if (!feeUnits) throw new Error("Fee Unit Calculation Error");

        const fee = ValueUnits.fromUnits(BigInt(feeUnits), solToken.decimals).value;
        routing.amount = balance - fee;

        const txn = await this._transactions.sendSolTransaction(routing);

        //Send Transactions
        await this._client.sendTransaction(txn, [
            SolanaAccounts.getSignerObject(signer),
        ]);

        //console.log("Sent {0} SOL to {1} to close account", routing.amount, receiver.addr);
        console.log(
            `Sent ${routing.amount} SOL to ${receiver.addr} to close account ${signer.addr}`
        );
        return true;
    }

    /**
   * @method sendSol
   * @param routing
   * @param signer
   * @returns
   * @description transfers SOL
   */
    public async sendSol(
        routing: Routing,
        signer: SolanaAccount
    ): Promise<boolean> {
    // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
                if (!this._transactions)
                    throw new Error(SolanaError.UNDEFINED_TRANSACTION);
                if (!this._accounts) throw new Error(SolanaError.ACCOUNTS_NOT_SET);

                //Get Transactions
                console.log(
                    `Sending ${routing.amount} SOL from ${signer.addr} to ${routing.to.address}`
                );
                const txn = await this._transactions.sendSolTransaction(routing);

                //Send Transactions
                const result = await this._client.sendTransaction(txn, [
                    SolanaAccounts.getSignerObject(signer),
                ]);

                console.log(`SOL Sent ${result}`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
   * @method sendTokens
   * @param routing
   * @param account
   * @param token
   * @returns
   * @description transfers SPL token
   */
    public async sendTokens(
        routing: Routing,
        account: SolanaAccount,
        token: BridgeToken
    ): Promise<boolean> {
    // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._transactions)
                    throw new Error(SolanaError.UNDEFINED_TRANSACTION);
                if (!account) throw new Error(SolanaError.INVALID_ACCOUNT);
                if (!token) throw new Error(SolanaError.INVALID_ASSET);
                if (!this._assets) throw new Error(SolanaError.UNDEFINED_SOL_ASSETS);

                if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
                if (!this._transactions)
                    throw new Error(SolanaError.UNDEFINED_TRANSACTION);
                if (!this._accounts) throw new Error(SolanaError.ACCOUNTS_NOT_SET);

                //get token accounts
                const senderTokenAccount = await this._assets.getTokenAccount(
                    account.pk,
                    token
                );
                const receiverTokenAccount = await this._assets.getTokenAccount(
                    new PublicKey(routing.to.address),
                    token
                );
                if (!senderTokenAccount) {
                    throw new Error(`Sender Token Account not found for ${account.addr}`);
                }
                if (!receiverTokenAccount) {
                    throw new Error(
                        `Receiver Token Account not found for ${routing.to.address}`
                    );
                }
                //Get Txn
                console.log(
                    `Sending ${routing.amount} ${token.symbol} from ${routing.from.address} to ${routing.to.address}`
                );
                const txn = await this._transactions.sendTokenTransaction(
                    routing,
                    senderTokenAccount.address,
                    receiverTokenAccount.address,
                    token
                );

                //Send Transactions
                const result = await this._client.sendTransaction(txn, [
                    SolanaAccounts.getSignerObject(account),
                ]);

                console.log(`${token.symbol} Sent ${result}`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
   * @method optinToken
   * @param account
   * @param symbol
   * @returns
   * @description creates token account
   */
    async optinToken(account: SolanaAccount, symbol: string): Promise<boolean> {
    // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._assets) throw new Error("Solana Assets not defined");
                if (!this._transactions)
                    throw new Error(SolanaError.UNDEFINED_TRANSACTION);
                if (!account) throw new Error(SolanaError.INVALID_ACCOUNT);
                if (!this._client) throw new Error(SolanaError.UNDEFINED_SOL_ASSETS);
                //Fail Safe

                //Get Token
                const token = BridgeTokens.get("solana", symbol);
                if (!token) throw new Error(SolanaError.ASSETS_NOT_SET);
                if (!token.address) throw new Error(SolanaError.INVALID_ASSET_ID);
                if (typeof token.address !== "string")
                    throw new Error(SolanaError.INVALID_ASSET_ID_TYPE);

                //Get Txn
                console.log(`Opting in ${account.addr} to ${token.address}`);

                //get token account
                const tokenAccount = await this._assets.getTokenAccount(
                    account.pk,
                    token
                );
                if (tokenAccount) {
                    console.log(
                        `Account ${account.addr} already opted in to ${token.address}`
                    );
                    resolve(true);
                    return;
                }

                //Create new account
                const signer = SolanaAccounts.getSignerObject(account);
                const newAccount = await this._assets.createTokenAccount(
                    signer,
                    account.pk,
                    token
                );

                console.log(`Account ${account.addr} opted in to ${token.address}`);
                console.log(util.inspect(newAccount, false, 5, true));

                // const transactions: Transaction[] = [];
                // const txn = await this._transactions.optinTransaction(signer.addr, token.address);
                // transactions.push(txn);

                // //Send Txn
                // await this.signAndSend_SingleSigner(transactions, signer);
                console.log(`Optin Completed`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
   * @method closeOutAccount
   * @param signer
   * @param receiver
   * @param symbol
   * @returns
   */
    public async closeOutTokenAccount(
        signer: SolanaAccount,
        receiver: SolanaAccount,
        symbol: string
    ) {
    //Fail Safe
        if (!this._transactions) throw new Error(SolanaError.UNDEFINED_TRANSACTION);
        if (!this._assets) throw new Error(SolanaError.UNDEFINED_SOL_ASSETS);

        //Get balance
        let balance = await this.getTokenBalance(signer.addr, symbol);

        //Get Token
        const token = BridgeTokens.get("solana", symbol);
        if (!token) throw new Error(SolanaError.INVALID_ASSET);
        if (!token.address) throw new Error(SolanaError.INVALID_ASSET_ID);
        if (typeof token.address !== "string")
            throw new Error(SolanaError.INVALID_ASSET_ID_TYPE);

        //Check if balance needs to be closed out
        if (balance > 0) {
            //Get routing
            await this.fundAccountTokens(signer, receiver, balance, symbol);
            balance = await this.waitForTokenBalance(signer.addr, symbol, 0);
            console.log(
                `Sent ${balance} ${symbol} to ${receiver.addr}. New Balance: ${balance}`
            );
        }
        //get token account
        const tokenAccount = await this._assets.getTokenAccount(signer.pk, token);
        if (!tokenAccount) throw new Error(SolanaError.UNDEFINED_TOKEN_ACCOUNT);

        this._transactions.closeTokenAccountTransaction(
            signer.pk,
            tokenAccount.address
        );
        return true;
    }

    /**
   * @method optinAccountExists
   * @param account
   * @param symbol
   * @returns
   */
    async optinAccountExists(
        account: SolanaAccount,
        symbol: string
    ): Promise<boolean> {
    //Fail Safe
        if (!this._assets) throw new Error(SolanaError.UNDEFINED_SOL_ASSETS);

        // //Get Token
        const token = BridgeTokens.get("solana", symbol);
        if (!token) throw new Error(SolanaError.INVALID_ASSET);
        if (!token.address) throw new Error(SolanaError.INVALID_ASSET_ID);
        if (typeof token.address !== "string")
            throw new Error(SolanaError.INVALID_ASSET_ID_TYPE);

        //get token account
        const tokenAccount = await this._assets.getTokenAccount(account.pk, token);
        if (tokenAccount) {
            return true;
        } else {
            return false;
        }
    }

    //Account Info
    /**
   * @method getBalance
   * @param address
   * @returns balance of address
   */
    public async getBalance(address: string): Promise<number> {
        if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
        if (!this._transactions) throw new Error(SolanaError.UNDEFINED_TRANSACTION);
        if (!this._accounts) throw new Error(SolanaError.ACCOUNTS_NOT_SET);

        //get account
        const account = this._accounts.getAccount(address);
        if (!account) throw new Error(SolanaError.INVALID_ACCOUNT);

        //Get sol token
        const solToken = await this._transactions.SolToken;
        if (!solToken) throw new Error(SolanaError.SOL_TOKEN_NOT_SET);

        let units = await this._client.getBalance(account.pk);

        //Convert units to integer.  The precision round floating point errors
        units = Number(Precise(units).toString());
        const balance = ValueUnits.fromUnits(
            BigInt(units),
            solToken.decimals
        ).value;

        return balance;
    }

    /**
   * @method waitForBalance
   * @param address
   * @param expectedAmount
   * @param timeoutSeconds
   * @param threshold
   * @param anybalance
   * @param noBalance
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
            LogProgress(
                `$bal. (${balance}), Timeout in ${
                    Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
                }s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error("Timeout waiting for balance");
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getBalance(address);
        }
        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `$bal. (${balance}), Timeout in ${
                Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
            }s`
        );

        return balance;
    }

    /**
   * @method waitForMinBalance
   * @param address
   * @param minAmount
   * @param timeoutSeconds
   * @returns
   */
    public async waitForMinBalance(
        address: string,
        minAmount: number,
        timeoutSeconds = 60
    ): Promise<number> {
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
            LogProgress(
                `$bal. (${balance}), Timeout in ${
                    Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
                }s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error("Timeout waiting for balance");
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getBalance(address);
        }
        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `$bal. (${balance}), Timeout in ${
                Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
            }s`
        );

        return balance;
    }

    /**
   * @method waitForBalanceChange
   * @param address
   * @param startingAmount
   * @param timeoutSeconds
   * @returns
   */
    public async waitForBalanceChange(
        address: string,
        startingAmount: number,
        timeoutSeconds = 60
    ): Promise<number> {
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
            LogProgress(
                `$bal. (${balance}), Timeout in ${
                    Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
                }s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error("Timeout waiting for balance");
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getBalance(address);
        }
        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `$bal. (${balance}), Timeout in ${
                Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
            }s`
        );

        return balance;
    }

    /**
   * @method getTokenBalance
   * @param address
   * @param symbol
   * @returns balnce of token(symbol) for the address
   */
    public async getTokenBalance(
        address: string,
        symbol: string
    ): Promise<number> {
    //Fail Safe
        if (!this._assets) throw new Error("Solana Assets not defined");
        if (!this._transactions) throw new Error(SolanaError.UNDEFINED_TRANSACTION);
        if (!this._accounts) throw new Error(SolanaError.INVALID_ACCOUNT);
        if (!this._client) throw new Error(SolanaError.UNDEFINED_SOL_ASSETS);

        //Get Token
        const token = BridgeTokens.get("solana", symbol);
        if (!token) throw new Error(SolanaError.INVALID_ASSET);
        if (!token.address) throw new Error(SolanaError.INVALID_ASSET_ID);
        if (typeof token.address !== "string")
            throw new Error(SolanaError.INVALID_ASSET_ID_TYPE);

        //get token account
        const tokenAccount = await this._assets.getTokenAccount(
            new PublicKey(address),
            token
        );
        if (!tokenAccount) throw new Error(SolanaError.UNDEFINED_TOKEN_ACCOUNT);

        //Get balance (Units)
        const unitsContext = await this._client.getTokenAccountBalance(
            tokenAccount.address
        );
        const unitsValue = unitsContext.value;
        const balance = ValueUnits.fromUnits(
            BigInt(unitsValue.amount),
            unitsValue.decimals
        ).value;
        return balance;
    }

    /**
   * @method waitForTokenBalance
   * @param address
   * @param symbol
   * @param expectedAmount
   * @param timeoutSeconds
   * @param threshold
   * @param anybalance
   * @param noBalance
   * @returns
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
                `${symbol} bal. (${balance}), Timeout in ${
                    Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
                }s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error(SolanaError.TIMEOUT);
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getTokenBalance(address, symbol);
        }
        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `${symbol} bal. (${balance}), Timeout in ${
                Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
            }s`
        );

        return balance;
    }

    /**
   * @method waitForMinTokenBalance
   * @param address
   * @param symbol
   * @param minAmount
   * @param timeoutSeconds
   * @returns
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
            if (balance >= minAmount) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(
                `${symbol} bal. (${balance}), Timeout in ${
                    Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
                }s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error(SolanaError.TIMEOUT);
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getTokenBalance(address, symbol);
        }
        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `${symbol} bal. (${balance}), Timeout in ${
                Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
            }s`
        );

        return balance;
    }

    /**
   * @method waitForTokenBalance
   * @param address
   * @param symbol
   * @param startingAmount
   * @param timeoutSeconds
   * @returns the changed token balance of adddress
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
            if (balance != startingAmount) {
                break;
            }

            //Log
            const timeInSeconds = (Date.now() - start) / 1000;
            LogProgress(
                `${symbol} bal. (${balance}), Timeout in ${
                    Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
                }s`
            );

            //Check timeout
            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error(SolanaError.TIMEOUT);
            }

            //Wait and Check balance
            await Sleep(1000);
            balance = await this.getTokenBalance(address, symbol);
        }
        //Log
        const timeInSeconds = (Date.now() - start) / 1000;
        LogProgress(
            `${symbol} bal. (${balance}), Timeout in ${
                Math.round((timeoutSeconds - timeInSeconds) * 10) / 10
            }s`
        );

        return balance;
    }

    //Helper Functions
    async getTestAirDrop(signer: SolanaAccount): Promise<boolean> {
    // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
                await this._client.requestAirdrop(signer.pk, 1_000_000_000);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Txn helper
    async sendAndConfirmTransaction(
        txn: Transaction,
        account: SolanaAccount
    ): Promise<string> {
    // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                if (!txn) throw new Error(SolanaError.UNDEFINED_TRANSACTION);
                if (!account) throw new Error(SolanaError.UNDEFINED_ACCOUNTS);
                if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
                const wallet = Keypair.fromSecretKey(account.sk);

                const txn_signature = await sendAndConfirmTransaction(
                    this._client,
                    txn,
                    [wallet]
                );

                resolve(txn_signature);
            } catch (err) {
                reject(err);
            }
        });
    }
    public get client() {
        return this._client;
    }
    public get accounts() {
        return this._accounts;
    }
    public get assets() {
        return this._assets;
    }

    // wallet- txn helper
    public async sendSignedTransaction(
        txn: number[] | Uint8Array
    ): Promise<string> {
        if (!txn) throw new Error("Transaction is not Signed");
        if (!this._client) throw new Error(SolanaError.CLIENT_NOT_SET);
        const txn_hash = await this._client.sendRawTransaction(txn, {
            skipPreflight: false,
            preflightCommitment: COMMITMENT,
        });

        return txn_hash;
    }

    // get Id
    public getTxnHashedFromBase58(txnID: string): string {
        return ethers.utils.keccak256(base58.decode(txnID));
    }
    public getSolanaBridgeAddress(
        id: SolanaProgramId
    ): string | number | undefined {
        return this._bridgeTxnsV1?.getGlitterAccountAddress(id);
    }
    public get tokenBridgePollerAddress(): string | number | undefined {
        return this._config?.accounts?.bridgeProgram;
    }
    public get usdcBridgePollerAddress(): string | number | undefined {
        return this._config?.accounts?.usdcDeposit;
    }
    public get tokenBridgeSolVault(): string | number | undefined {
        return this._config?.accounts?.solVault;
    }
    public get usdcBridgeDepositAddress(): string | number | undefined {
        return this._config?.accounts?.usdcDeposit;
    }
    public get usdcBridgeDepositTokenAddress(): string | number | undefined {
        return this._config?.accounts?.usdcDepositTokenAccount;
    }
    public get usdcBridgeReceiverAddress(): string | number | undefined {
        return this._config?.accounts?.usdcReceiver;
    }
    public get usdcBridgeReceiverTokenAddress(): string | number | undefined {
        return this._config?.accounts?.usdcReceiverTokenAccount;
    }
    public get tokenBridgeV2Address(): string | number | undefined {
        return this._config?.accounts?.tokenBridgeV2Address;
    }
    public getMintAddress(symbol: string): string | undefined {
        try {
            if (!this._accounts) throw new Error("Solana Accounts not defined");

            //Get Token
            const token = BridgeTokens.get("solana", symbol);
            if (!token) throw new Error("Token not found");
            if (!token.address) throw new Error("mint address is required");
            if (typeof token.address !== "string")
                throw new Error("token address is required in string format");
            return token.address;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }
    public getToken(token: string): BridgeToken | undefined {
        return BridgeTokens.get("solana", token);
    }

    public async Reconnect(): Promise<void> {
        if (this._config) this._client = new Connection(this._config.server);
        Sleep(1000);
    }
}
