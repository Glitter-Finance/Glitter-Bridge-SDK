import * as algoSdk from 'algosdk';
import {AlgorandNativeTokenConfig, AlgorandStandardAssetConfig, BridgeTokens} from "@glitter-finance/sdk-core";
import {
    BridgeNetworks,
    GlitterBridgeSDK,
    GlitterEnvironment
} from "@glitter-finance/sdk-core";
import {formatJsonRpcRequest} from "@json-rpc-tools/utils";
import BigNumber from "bignumber.js"

export class AlgorandBridge {
    private sdk: GlitterBridgeSDK;

    constructor(testnet = false) {
        this.sdk = new GlitterBridgeSDK();
        this.sdk.setEnvironment(testnet ? GlitterEnvironment.testnet : GlitterEnvironment.mainnet);
        this.sdk.connect([BridgeNetworks.algorand]);
    }

    /**
     * Sending Raw Transaction over the Algorand Network
     * @param rawSignedTransactions
     */
    public async sendSignTransaction(
        rawSignedTransactions: Uint8Array[]
    ): Promise<string> {
        if (!rawSignedTransactions) throw new Error("AlgoError.UNDEFINED_TRANSACTION");
        if (!this.sdk.algorand || !this.sdk.algorand.client) throw new Error("AlgoError.CLIENT_NOT_SET");
        const {txId} = await this.sdk.algorand.client.sendRawTransaction(rawSignedTransactions).do();
        await algoSdk.waitForConfirmation(this.sdk.algorand.client, txId, 4);

        return txId;
    }

    /**
     * Opting a new token in to the wallet
     * @param signerAddress
     * @param symbol
     */
    public async optIn(signerAddress: string, symbol: string): Promise<{ txn: algoSdk.Transaction }[]> {
        const token: AlgorandNativeTokenConfig | AlgorandStandardAssetConfig = BridgeTokens.getToken(BridgeNetworks.algorand, symbol);
        if (!token || (token as AlgorandNativeTokenConfig).isNative) throw new Error("Unsupported asset");

        const transactions: algoSdk.Transaction[] = [];
        const transaction = await this.sdk.algorand?.optinTransaction(
            signerAddress,
            token.symbol
        )
        if (transaction) {
            transactions.push(transaction);
            const txs = transactions.map((txn) => {
                return {
                    txn: txn,
                };
            });

            return txs;
        } else {
            throw "Transaction not generated";
        }
    
    }

    /**
     * Bridging a token from Algorand to other supported network
     * @param signerAddress
     * @param toNetwork
     * @param toWalletAddress
     * @param symbol
     * @param amount
     */
    public async bridge(signerAddress: string, toNetwork: BridgeNetworks, toWalletAddress: string, symbol: string, amount: number): Promise<{txn: algoSdk.Transaction }[]> {
        const token = BridgeTokens.getToken(BridgeNetworks.algorand, symbol);
        if (!token) throw new Error("AlgoError.INVALID_ASSET");
        if (!token.minTransfer) throw new Error("AlgoError: Minimum Transfer Not defined in token");
        if (!this.sdk.algorand?.client) throw new Error("AlgoError.CLIENT_NOT_SET");
        if (amount < token.minTransfer) {
            throw new Error(`AlgoError: Minimum Value should be ${token.minTransfer}`);
        }
        new BigNumber(amount).times(10 ** token.decimals).toNumber()
        const transaction = await this.sdk.algorand.bridgeTransactions(
            signerAddress,
            toWalletAddress,
            toNetwork,
            symbol,
            BigInt(new BigNumber(amount).times(10 ** token.decimals).toNumber())
        );

        const groupID = algoSdk.computeGroupID(transaction);

        for (let i = 0; i < transaction.length; i++) {
            transaction[i].group = groupID;
        }
        const txs = transaction.map((txn) => {
            return {
                txn: txn,
            };
        });

        return txs;
    }

    /**
     * Getting token balances by wallet address
     * @param address
     */
    public async getBalances(address: string): Promise<
    Map<string, {
      balanceBn: BigNumber;
      balanceHuman: BigNumber;
    }>
  > {
        const balances = new Map();
        const tokens = BridgeTokens.getTokens(BridgeNetworks.algorand);
        for (const token of tokens) {
            console.log("Token", token);
            try {
                const balance = await this.sdk.algorand?.getBalance(address, token.symbol)
                balances.set(token.symbol, balance)
            } catch (e) {
                console.error(e);
            }
        }

        return balances
    }

    /**
     * Function for checking whether the token is already opted in the wallet address.
     * @param address
     * @param symbol
     */
    public async optInAccountExists(address: string, symbol: string): Promise<boolean> {
        const token = BridgeTokens.getToken(BridgeNetworks.algorand, symbol)
        if ((token as AlgorandNativeTokenConfig).isNative) return true;
        if (!token) throw new Error("Unsupported asset");
        const response = await this.sdk.algorand?.isOptedIn((token as AlgorandStandardAssetConfig).assetId, address);
        if (response) {
            return response;
        } else {
            return false;
        }
    }

    public async getBalanceOfToken(signerAddress: string, symbol: string) {
        return await this.sdk.algorand?.getBalance(signerAddress, symbol)
    }

    public async getBridgeTokens() {
        return BridgeTokens.getTokens(BridgeNetworks.algorand)
    }

    public async getToken(tokenSymbol: string) {
        const token = BridgeTokens.getToken(BridgeNetworks.algorand, tokenSymbol);
        return token;
    }

    public async encodeAlgoTransaction(txnsArray: any) {
        const txnsToSign = txnsArray.map((txn: any) => {
            const encodedTxn = Buffer.from(
                algoSdk.encodeUnsignedTransaction(txn.txn)
            ).toString("base64");

            return {
                txn: encodedTxn,
                message: "Depositing Algo to bridge vault",
            };
        });

        const requestParams = [txnsToSign];
        const request = formatJsonRpcRequest("algo_signTxn", requestParams);

        return request;
    }

    public async convertToUInt8Array(txnsArray: any) {
        const response = txnsArray.map((element: any) => {
            return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
        });

        return response;
    }
}
