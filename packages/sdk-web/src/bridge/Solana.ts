import {BridgeNetworks, BridgeTokens, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";
import {PublicKey} from "@solana/web3.js";
import BigNumber from "bignumber.js";

export class SolanaBridge {
    private sdk: GlitterBridgeSDK;

    constructor(solanaRPC: string, testnet = false) {
        this.sdk = new GlitterBridgeSDK();
        this.sdk.setRPC(BridgeNetworks.solana, solanaRPC);
        this.sdk.setEnvironment(testnet ? GlitterEnvironment.testnet : GlitterEnvironment.mainnet);
        this.sdk.connect([BridgeNetworks.solana]);
    }

    public async sendSignedTransaction(
        transaction: Buffer,
        connection: "testnet" | "devnet" | "mainnet"
    ): Promise<string> {
        return await this.sdk.solana!.connections[connection].sendRawTransaction(
            transaction
        )
    }

    public async bridge(
        signerAddress: string,
        destinationAddress: string,
        destinationNetwork: BridgeNetworks,
        tokenSymbol: string,
        amount: number
    ) {
        const token = this.sdk.solana?.getToken(tokenSymbol)
        if (!token) throw new Error('Unsupported token')

        if (token.minTransfer && amount < token.minTransfer) {
            throw new Error('Amount too low')
        }

        const transaction = await this.sdk.solana?.bridgeTransaction(
            signerAddress,
            destinationAddress,
            destinationNetwork,
            tokenSymbol,
            BigInt(new BigNumber(amount).times(10 ** token.decimals).toNumber())
        )

        const connection = this.sdk.solana?.connections[this.sdk.solana?.defaultConnection];

        if (connection) {
            const blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
            if (transaction) {
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = new PublicKey(signerAddress);
            }

            return transaction;
        } else {
            throw "Connection Not Established";
        }
    }

    public async optInAccountExists(address: string, symbol: string): Promise<boolean> {
        const token = this.sdk.solana?.getToken(symbol)
        if (symbol.toLowerCase() === "sol") return true;
        if (!token) throw new Error('Unsupported token')
        const optinAccount = await this.sdk.solana!.isOptedIn(symbol, address)
        return !!optinAccount
    }

    public async optIn(address: string, symbol: string) {
        const transaction = await this.sdk.solana?.optinTransaction(address, symbol);
        const connection = this.sdk.solana?.connections[this.sdk.solana?.defaultConnection];

        if (connection) {
            const blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
            if (transaction) {
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = new PublicKey(address);
            }

            return transaction;
        } else {
            throw "Connection Not Established";
        }
    }

    public async getBalanceOfToken(signerAddress: string, symbol: string) {
        const token = this.sdk.solana?.getToken(symbol)
        if (!token) throw new Error('Unsupported token')
        return this.sdk.solana?.getBalance(
            signerAddress,
            symbol
        );
    }

    public async getBalances(address: string): Promise<Map<string, {
    balanceBn: BigNumber;
    balanceHuman: BigNumber;
  }>> {
        const balances = new Map();
        const tokens = BridgeTokens.getTokens(BridgeNetworks.solana);
        for (const token of tokens) {
            const balance = await this.getBalanceOfToken(address, token.symbol);
            balances.set(token.symbol, balance)
        }

        return balances
    }

    public async getBridgeTokens() {
        return BridgeTokens.getTokens(BridgeNetworks.solana);
    }

    public async getToken(tokenSymbol: string) {
        const token = this.sdk.solana?.getToken(tokenSymbol);
        return token;
    }
}