import {
    Connection, Keypair, PublicKey, Transaction
} from "@solana/web3.js";
import {SolanaConfig, SolanaPublicNetworks} from "./types";
import {SolanaAccount, SolanaAccountsStore} from "./AccountsStore";
import {GlitterBridgeConfig, GlitterEnvironment} from "../../../types";
import {BridgeNetworks, BridgeTokenConfig, BridgeTokens, Routing, Sleep} from "../../../lib/common";
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
            amount: bigAmount.div(10**token.decimals).toNumber(),
            units: bigAmount.toString()
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
            this.connections[this.defaultConnection]
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
}
