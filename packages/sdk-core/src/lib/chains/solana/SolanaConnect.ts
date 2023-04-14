import {
    Connection, Keypair, PublicKey, Transaction
} from "@solana/web3.js";
import {SolanaConfig, SolanaPublicNetworks} from "./types";
import {SolanaAccount, SolanaAccountsStore} from "./AccountsStore";
import {GlitterBridgeConfig, GlitterEnvironment} from "../../../types";
import {BridgeNetworks, BridgeTokenConfig, BridgeTokens, Routing, Sleep} from "../../../lib/common";
import BigNumber from "bignumber.js";
import {bridgeUSDC, createAssociatedTokenAccountTransaction, getAssociatedTokenAccount, solBridgeTransaction, tokenBridgeTransaction} from "./transactions";

export class SolanaConnect {
    readonly defaultConnection: "testnet" | "devnet" | "mainnet";
    readonly accountStore: SolanaAccountsStore;
    readonly solanaConfig: SolanaConfig;
    readonly connections: Record<"testnet" | "devnet" | "mainnet", Connection>;

    constructor(config: GlitterBridgeConfig) {
        this.defaultConnection = config.name === GlitterEnvironment.mainnet ? 
            "mainnet" : "testnet"
        
        this.connections = {
            devnet: new Connection(SolanaPublicNetworks.devnet.toString()),
            mainnet: new Connection(
                this.defaultConnection === "testnet" ?
                    SolanaPublicNetworks.mainnet_beta.toString() :
                    config.solana.server
            ),
            testnet: new Connection(
                this.defaultConnection === "mainnet" ?
                    SolanaPublicNetworks.testnet.toString() :
                    config.solana.server
            )
        }
        this.accountStore = new SolanaAccountsStore(
            config.name === GlitterEnvironment.mainnet ?
                this.connections.mainnet : this.connections.testnet
        )
        this.solanaConfig = config.solana
        BridgeTokens.loadConfig(BridgeNetworks.solana, config.solana.tokens)
    }
    /**
     * Provides token configuration by token symbol
     * @param {string} tokenSymbol
     * @returns {BridgeTokenConfig | undefined}
     */
    public getToken(tokenSymbol: string): BridgeTokenConfig | undefined {
        return BridgeTokens.getToken(BridgeNetworks.solana, tokenSymbol)
    }
    /**
     * Create bridge token transaction
     * @param {string} sourceAddress 
     * @param {string} tokenSymbol 
     * @param {BridgeNetworks} destinationNetwork 
     * @param {string} destinationAddress 
     * @param {bigint} amount 
     * @returns {Promise<Transaction>}
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
     * Send tokens using stored account
     * @param {string} sourceAddress 
     * @param {string} tokenSymbol 
     * @param {BridgeNetworks} destinationNetwork 
     * @param {string} destinationAddress 
     * @param {string} amount 
     * @returns {Promise<string>} transaction id
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
     * Send a transaction
     * @param {Connection} connection 
     * @param {Transaction} ransaction 
     * @param {SolanaAccount} account 
     * @returns {Promise<string>} transaction id
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
     * Get balance of an account via token symbol
     * @param {string} account 
     * @param {string} tokenSymbol 
     * @returns {Promise<{balanceBn: BigNumber; balanceHuman: BigNumber}>}
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

    private getConnection(tokenSymbol: string): Connection {
        const isUSDC = tokenSymbol.trim().toLowerCase() === "usdc"
        const isTestnet = this.defaultConnection === "testnet"
        return isTestnet && isUSDC ? this.connections.devnet : this.connections[this.defaultConnection]
    }
    /**
     * Prepare Create SPL Token Account Transaction on Solana
     * @param {string} signerAddress 
     * @param {string} tokenSymbol 
     * @returns {Promise<Transaction>}
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
     * Prepare and Sign,Send Create SPL Token Account Transaction on Solana
     * @param {string} signerAddress 
     * @param {string} tokenSymbol 
     * @returns {Promise<Transaction>}
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
     * Check if token account exists for a token symbol
     * @param {string} tokenSymbol 
     * @param {string} address 
     * @returns {Promise<boolean>}
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
}
