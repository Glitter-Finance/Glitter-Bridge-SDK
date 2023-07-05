import {
    Connection, Keypair, PublicKey, Transaction
} from "@solana/web3.js";
import { SolanaConfig, SolanaPublicNetworks } from "./types";
import { SolanaAccount, SolanaAccountsStore } from "./AccountsStore";
import { GlitterBridgeConfig, GlitterEnvironment } from "../../../types";
import { BridgeNetworks, BridgeTokenConfig, BridgeTokens, Routing, Sleep } from "../../../lib/common";
import BigNumber from "bignumber.js";
import { LoadSolanaSchema, bridgeUSDC, createAssociatedTokenAccountTransaction, getAssociatedTokenAccount, solBridgeTransaction, tokenBridgeTransaction } from "./transactions";

/**
 * Represents a connection to the Solana network.
 *
 * @class SolanaConnect
 */
export class SolanaConnect {
    readonly defaultConnection: "testnet" | "devnet" | "mainnet";
    readonly accountStore: SolanaAccountsStore;
    readonly solanaConfig: SolanaConfig;
    readonly connections: Record<"testnet" | "devnet" | "mainnet", Connection>;

    /**
     * Represents a connection to the Solana network.
     *
     * @class SolanaConnect
     * @constructor
     * @param {GlitterBridgeConfig} config - The configuration object for the Solana connection.
     */
    constructor(config: GlitterBridgeConfig) {
        this.defaultConnection = config.name === GlitterEnvironment.mainnet ? 
            "mainnet" : "testnet"

        //get urls
        let mainnetURL = SolanaPublicNetworks.mainnet_beta.toString();
        const devnetURL = SolanaPublicNetworks.devnet.toString();
        let testnetURL = SolanaPublicNetworks.testnet.toString();

        if (config.name === GlitterEnvironment.mainnet && config.solana.server) mainnetURL = config.solana.server;
        if (config.name === GlitterEnvironment.testnet && config.solana.server) testnetURL = config.solana.server;
        //if (config.name === GlitterEnvironment.mainnet && config.solana.server) mainnetURL = config.solana.server;

        this.connections = {
            devnet : new Connection(devnetURL),
            testnet : new Connection(testnetURL),
            mainnet : new Connection(mainnetURL)
        };
       
        this.accountStore = new SolanaAccountsStore(
            config.name === GlitterEnvironment.mainnet ?
                this.connections.mainnet : this.connections.testnet
        )
        this.solanaConfig = config.solana
        BridgeTokens.loadConfig(BridgeNetworks.solana, config.solana.tokens)

        //load schema
        LoadSolanaSchema();
    }

    /**
     * Retrieves the configuration for a token based on its symbol.
     *
     * @method getToken
     * @param {string} tokenSymbol - The symbol of the token for which to retrieve the configuration.
     * @returns {BridgeTokenConfig|undefined} - The configuration for the token if found, or undefined if the token is not found.
     */
    public getToken(tokenSymbol: string): BridgeTokenConfig | undefined {
        return BridgeTokens.getToken(BridgeNetworks.solana, tokenSymbol)
    }

    /**
     * Initiates a bridge transaction to transfer tokens from the source network to the destination network.
     *
     * @method bridgeTransaction
     * @async
     * @param {string} sourceAddress - The source address from which to transfer the tokens.
     * @param {string} destinationAddress - The destination address to receive the transferred tokens.
     * @param {BridgeNetworks} destinationNetwork - The destination network to bridge the tokens to.
     * @param {string} tokenSymbol - The symbol of the token to be bridged.
     * @param {bigint} amount - The amount of tokens to be bridged, represented as a bigint.
     * @returns {Promise<Transaction>} - A Promise that resolves to the transaction for the bridge operation.
     */
    async bridgeTransaction(
        sourceAddress: string,
        destinationAddress: string,
        destinationNetwork: BridgeNetworks,
        tokenSymbol: string,
        amount: bigint
    ): Promise<Transaction> {
        const token = BridgeTokens.getToken(BridgeNetworks.solana, tokenSymbol);
        if (!token) return Promise.reject(new Error('Unable to find token configuration'));

        const bigAmount = new BigNumber(amount.toString())
        const routingInfo: Routing = {
            from: {
                address: sourceAddress,
                network: BridgeNetworks.solana.toString().toLowerCase(),
                token: token.symbol,
                txn_signature: ""
            },
            to: {
                address: destinationAddress,
                network: destinationNetwork.toString().toLowerCase(),
                token: token.wrappedSymbol ?? token.symbol,
                txn_signature: ""
            },
            amount: bigAmount.div(10**token.decimals),
            units: bigAmount
        }

        const symbolLowercase = tokenSymbol.toLowerCase()
        if (symbolLowercase === "usdc") {
            const connection = this.defaultConnection === "mainnet" ? this.connections.mainnet : this.connections.devnet
            const transaction = await bridgeUSDC(
                connection,
                sourceAddress,
                destinationAddress,
                destinationNetwork,
                new BigNumber(amount.toString()),
                this.solanaConfig.accounts,
                token,
            )

            return transaction;
        } else if (symbolLowercase === "sol") {
            const connection = this.defaultConnection === "mainnet" ? this.connections.mainnet : this.connections.testnet
            const transaction = await solBridgeTransaction(
                connection,
                new PublicKey(sourceAddress),
                routingInfo,
                token,
                this.solanaConfig.accounts
            )

            return transaction;
        } else {
            const connection = this.defaultConnection === "mainnet" ? this.connections.mainnet : this.connections.testnet
            const transaction = await tokenBridgeTransaction(
                connection,
                new PublicKey(sourceAddress),
                routingInfo,
                token,
                this.solanaConfig.accounts
            )

            return transaction
        }
    }

    /**
     * Initiates a bridge operation to transfer tokens from the source network to the destination network.
     *
     * @method bridge
     * @async
     * @param {string} sourceAddress - The source address from which to transfer the tokens.
     * @param {string} destinationAddress - The destination address to receive the transferred tokens.
     * @param {BridgeNetworks} destinationNetwork - The destination network to bridge the tokens to.
     * @param {string} tokenSymbol - The symbol of the token to be bridged.
     * @param {bigint} amount - The amount of tokens to be bridged, represented as a bigint.
     * @returns {Promise<string>} - A Promise that resolves to a string representing the transaction hash or identifier for the bridge operation.
     */
    async bridge(
        sourceAddress: string,
        destinationAddress: string,
        destinationNetwork: BridgeNetworks,
        tokenSymbol: string,
        amount: bigint
    ): Promise<string> {
        const transaction = await this.bridgeTransaction(
            sourceAddress,
            destinationAddress,
            destinationNetwork,
            tokenSymbol,
            amount
        )
        let connection = this.connections[this.defaultConnection]
        const account = this.accountStore.get(sourceAddress)
        if (tokenSymbol.toLowerCase() === "usdc" && this.defaultConnection === "testnet") {
            connection = this.connections.devnet
        }

        if (!account) {
            return Promise.reject('Account unavailable');
        }

        return await this.sendTransaction(
            connection,
            transaction,
            account
        )
    }

    /**
     * Sends a transaction to the Solana network using the provided connection and account.
     *
     * @method sendTransaction
     * @async
     * @param {Connection} connection - The Solana connection object to use for sending the transaction.
     * @param {Transaction} transaction - The transaction to be sent.
     * @param {SolanaAccount} account - The Solana account to use for signing the transaction.
     * @returns {Promise<string>} - A Promise that resolves to a string representing the transaction hash or identifier.
     */
    private async sendTransaction(
        connection: Connection,
        transaction: Transaction,
        account: SolanaAccount
    ): Promise<string> {
        const txID = await connection.sendTransaction(
            transaction,
            [Keypair.fromSecretKey(account.sk)],
            {
                skipPreflight: true,
                preflightCommitment: "processed",
            }
        );
        return txID
    }

    /**
     * Retrieves the balance of a specific token for a given account.
     *
     * @method getBalance
     * @async
     * @param {string} account - The account for which to retrieve the balance.
     * @param {string} tokenSymbol - The symbol of the token for which to retrieve the balance.
     * @returns {Promise<Balance>} - A Promise that resolves to an object containing the balance information for the specified token.
     */
    public async getBalance(account: string, tokenSymbol: string) {
        const tksLowercase = tokenSymbol.trim().toLowerCase()
        const token = this.getToken(tokenSymbol)
        if (!token) return Promise.reject(new Error('Token Config unavailable'))
        const isNative = tksLowercase === "sol"

        return isNative ? await this.accountStore.getSOLBalance(
            account,
            this.connections[this.defaultConnection]
        ) : await this.accountStore.getSPLTokenBalance(
            account,
            token,
            this.getConnection(tokenSymbol)
        )
    }

    /**
     * Waits for the balance of a specific token for a given address to change to an expected amount within a specified timeout.
     *
     * @method waitForBalanceChange
     * @async
     * @param {string} address - The address for which to wait for the balance change.
     * @param {string} tokenSymbol - The symbol of the token for which to wait for the balance change.
     * @param {number} expectedAmount - The expected amount to which the balance should change.
     * @param {number} [timeoutSeconds=60] - The timeout duration in seconds (optional, defaults to 60 seconds).
     * @param {number} [threshold=0.001] - The threshold for considering the balance change significant (optional, defaults to 0.001).
     * @param {boolean} [anybalance=false] - Set to true to consider any balance change as valid (optional, defaults to false).
     * @param {boolean} [noBalance=false] - Set to true to wait for the balance to reach zero (optional, defaults to false).
     * @returns {Promise<number>} - A Promise that resolves to the final balance after the change.
     */
    public async waitForBalanceChange(
        address: string,
        tokenSymbol: string,
        expectedAmount: number,
        timeoutSeconds = 60,
        threshold = 0.001,
        anybalance = false,
        noBalance = false,
    ): Promise<number> {
        const start = Date.now();
        let balanceRes = await this.getBalance(address, tokenSymbol);
        let balance = balanceRes.balanceBn.toNumber()

        for (let i = 0; i <= timeoutSeconds; i++) {

            if (anybalance && balance > 0) {
                break;
            } else if (noBalance && balance == 0) {
                break;
            } else if (Math.abs(balance - expectedAmount) < threshold) {
                break;
            }

            if (Date.now() - start > timeoutSeconds * 1000) {
                throw new Error("Timeout waiting for balance");
            }

            await Sleep(1000);
            balanceRes = await this.getBalance(address, tokenSymbol);
            balance = balanceRes.balanceBn.toNumber()
        }
        return balance;
    }

    /**
     * Retrieves the connection for a specific token based on its symbol.
     *
     * @method getConnection
     * @param {string} tokenSymbol - The symbol of the token for which to retrieve the connection.
     * @returns {Connection} - The connection object for the specified token.
     */
    private getConnection(tokenSymbol: string): Connection {
        const isUSDC = tokenSymbol.trim().toLowerCase() === "usdc"
        const isTestnet = this.defaultConnection === "testnet"
        return isTestnet && isUSDC ? this.connections.devnet : this.connections[this.defaultConnection]
    }

    /**
     * Creates a transaction for opting in to a specific token.
     *
     * @method optinTransaction
     * @async
     * @param {string} signerAddress - The address of the account that will opt in to the token.
     * @param {string} tokenSymbol - The symbol of the token for which to create the opt-in transaction.
     * @returns {Promise<Transaction>} - A Promise that resolves to the transaction for opting in to the token.
     */
    async optinTransaction(signerAddress: string, tokenSymbol: string): Promise<Transaction> {
        if (tokenSymbol.trim().toLowerCase() === "sol") throw new Error('Opt in is not supported for native token')
        const token = this.getToken(tokenSymbol);
        if (!token) return Promise.reject(new Error("Unsupported token"));

        const txn = await createAssociatedTokenAccountTransaction(
            signerAddress,
            token,
            this.getConnection(tokenSymbol)
        )

        return txn
    }

    /**
     * Initiates the opt-in process for a specific token by creating and sending an opt-in transaction.
     *
     * @method optin
     * @async
     * @param {string} signerAddress - The address of the account that will opt in to the token.
     * @param {string} tokenSymbol - The symbol of the token for which to initiate the opt-in process.
     * @returns {Promise<string>} - A Promise that resolves to a string representing the transaction hash or identifier for the opt-in transaction.
     */
    async optin(signerAddress: string, tokenSymbol: string): Promise<string> {
        const signer = this.accountStore.get(signerAddress)
        if (!signer) throw new Error('Account unavailable')

        const transaction = await this.optinTransaction(
            signerAddress,
            tokenSymbol
        )

        const txId = await this.sendTransaction(this.getConnection(tokenSymbol), transaction, signer)
        return txId
    }

    /**
     * Checks if a specific address has opted in to a token.
     *
     * @method isOptedIn
     * @async
     * @param {string} tokenSymbol - The symbol of the token to check.
     * @param {string} address - The address to check for opt-in status.
     * @returns {Promise<boolean>} - A Promise that resolves to a boolean indicating whether the address has opted in to the token.
     */
    async isOptedIn(tokenSymbol: string, address: string): Promise<boolean> {
        if (tokenSymbol.trim().toLowerCase() === "sol") throw new Error('Opt in is not supported for native token')
        const token = this.getToken(tokenSymbol);
        if (!token) return Promise.reject(new Error("Unsupported token"));
        try {
            const tokenAccount = await getAssociatedTokenAccount(address, token, this.getConnection(tokenSymbol))
            return !!tokenAccount
        } catch (error) {
            return false
        }
    }

    /**
     * Retrieves the address associated with a specific key from the SolanaConfig accounts.
     *
     * @method getAddress
     * @param {string} key - The key for which to retrieve the address.
     * @returns {string} - The address associated with the specified key.
     */
    getAddress(key: keyof SolanaConfig["accounts"]): string {
        return this.solanaConfig.accounts[key];
    }

    /**
     * Reconnects the Solana connection.
     *
     * @method reconnect
     * @returns {void}
     */
    reconnect() {
        this.connections.devnet = new Connection(SolanaPublicNetworks.devnet.toString());
        this.connections.testnet = new Connection(SolanaPublicNetworks.testnet.toString());
        this.connections.mainnet = new Connection(SolanaPublicNetworks.mainnet_beta.toString());
    }

}
