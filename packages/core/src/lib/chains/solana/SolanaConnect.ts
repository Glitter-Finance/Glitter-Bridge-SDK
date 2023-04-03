import {
    Connection, Keypair, PublicKey, Transaction
} from "@solana/web3.js";
import {SolanaConfig, SolanaPublicNetworks} from "./types";
import {SolanaAccount, SolanaAccountsStore} from "./AccountsStore";
import {GlitterBridgeConfig, GlitterEnvironment} from "src/types";
import {BridgeNetworks, BridgeTokenConfig, BridgeTokens, Routing} from "src/lib/common";
import BigNumber from "bignumber.js";
import {bridgeUSDC, solBridgeTransaction, tokenBridgeTransaction} from "./transactions";

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
            mainnet: new Connection(SolanaPublicNetworks.mainnet_beta.toString()),
            testnet: new Connection(SolanaPublicNetworks.testnet.toString())
        }
        this.accountStore = new SolanaAccountsStore(
            config.name === GlitterEnvironment.mainnet ?
                this.connections.mainnet : this.connections.testnet
        )
        this.solanaConfig = config.solana
        BridgeTokens.loadConfig(BridgeNetworks.solana, config.solana.tokens)
    }

    public getToken(tokenSymbol: string): BridgeTokenConfig | undefined {
        return BridgeTokens.getToken(BridgeNetworks.solana, tokenSymbol)
    }
    /**
     * 
     * @param sourceAddress 
     * @param tokenSymbol 
     * @param destinationNetwork 
     * @param destinationAddress 
     * @param amount 
     * @returns 
     */
    private async bridgeTransaction(
        sourceAddress: string,
        tokenSymbol: string,
        destinationNetwork: BridgeNetworks,
        destinationAddress: string,
        amount: number
    ): Promise<Transaction> {
        const token = BridgeTokens.getToken(BridgeNetworks.solana, tokenSymbol);
        if (!token) return Promise.reject(new Error('Unable to find token configuration'));

        const bigAmount = new BigNumber(amount)
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
            amount: bigAmount.div(10**token.decimals).dp(2),
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
                new BigNumber(amount),
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
     * 
     * @param sourceAddress 
     * @param tokenSymbol 
     * @param destinationNetwork 
     * @param destinationAddress 
     * @param amount 
     * @returns 
     */
    async bridge(
        sourceAddress: string,
        tokenSymbol: string,
        destinationNetwork: BridgeNetworks,
        destinationAddress: string,
        amount: number
    ): Promise<string> {
        const transaction = await this.bridgeTransaction(
            sourceAddress, tokenSymbol, destinationNetwork, destinationAddress, amount
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
}
