import * as algosdk from "algosdk";
import {AlgorandConfig} from "./types";
import {AssetsRepository} from "./AssetsRepository";
import {BridgeNetworks} from "src/lib/common/networks";
import BigNumber from "bignumber.js";
import {bridgeDeposit, bridgeUSDC} from "./transactions";
import SendRawTransaction from "algosdk/dist/types/client/v2/algod/sendRawTransaction";
import {
    AlgorandNativeTokenConfig,
    AlgorandStandardAssetConfig,
    BridgeTokens,
    RoutingDefault,
} from "src/lib/common";
import {AlgorandAccountsStore} from "./AccountsStore";

export class AlgorandConnect {
    public readonly clientIndexer: algosdk.Indexer;
    public readonly assetsRepo: AssetsRepository;
    public readonly config: AlgorandConfig;
    public readonly client: algosdk.Algodv2;
    public readonly accountsStore: AlgorandAccountsStore;
    _lastTxnHash = "";
    /**
     * 
     * @param config 
     */
    constructor(config: AlgorandConfig) {
        this.config = config;
        this.client = this.getAlgodClient();
        this.clientIndexer = this.getAlgodIndexer();
        this.assetsRepo = new AssetsRepository(this.client);
        this.accountsStore = new AlgorandAccountsStore(this.client);
        BridgeTokens.loadConfig(BridgeNetworks.algorand, config.assets);

        config.assets.map(
            (conf: AlgorandNativeTokenConfig | AlgorandStandardAssetConfig) => {
                if ((conf as AlgorandStandardAssetConfig).assetId) {
                    return this.assetsRepo.addStandardAsset(
                        (conf as AlgorandStandardAssetConfig).assetId,
                        conf
                    );
                }
            }
        );
    }
    /**
     * 
     * @param sourceAddress 
     * @param destinationNetwork 
     * @param destinationAdress 
     * @param tokenSymbol 
     * @param amount 
     * @returns 
     */
    public async bridgeTransactions(
        sourceAddress: string,
        destinationNetwork: BridgeNetworks,
        destinationAdress: string,
        tokenSymbol: string,
        amount: bigint
    ): Promise<algosdk.Transaction[]> {
        const token = this.assetsRepo.getAsset(tokenSymbol);
        if (!token) return Promise.reject("Token unsupported");

        const depositAddress = this.config.bridgeAccounts.usdcDeposit;
        const routing = RoutingDefault();
        routing.from.address = sourceAddress;
        routing.from.token = tokenSymbol;
        routing.from.network = BridgeNetworks.algorand.toString().toLowerCase();
        routing.to.address = destinationAdress;
        routing.to.token = token.wrappedSymbol ?? token.symbol;
        routing.to.network = destinationNetwork.toString().toLowerCase();
        routing.amount = new BigNumber(amount.toString());

        const transactions =
      token.symbol.trim().toLowerCase() === "usdc"
          ? await bridgeUSDC(
              this.client,
              sourceAddress,
              destinationAdress,
              destinationNetwork,
              new BigNumber(amount.toString()),
              depositAddress,
            token as AlgorandStandardAssetConfig
          )
          : await bridgeDeposit(
              this.client,
              this.config.bridgeProgramId,
              sourceAddress,
              destinationAdress,
              destinationNetwork,
              amount,
              {
                  algoVault: this.config.bridgeAccounts.algoVault,
                  asaVault: this.config.bridgeAccounts.asaVault,
              },
              this.config.bridgeAccounts.feeReceiver,
              token
          );

        return transactions;
    }
    /**
     * 
     * @param rawsignedTxns 
     * @returns 
     */
    async sendSignedTransaction(
        rawsignedTxns: Uint8Array[]
    ): Promise<SendRawTransaction> {
        const txnResult = await this.client.sendRawTransaction(rawsignedTxns).do();
        await algosdk.waitForConfirmation(this.client, txnResult, 4);
        return txnResult;
    }
    /**
     * 
     * @returns 
     */
    getAlgodIndexer(): algosdk.Indexer {
        const indexer = new algosdk.Indexer(
            this.config.indexerUrl,
            this.config.indexerUrl,
            this.config.nativeTokenSymbol
        );
        indexer.setIntEncoding(algosdk.IntDecoding.MIXED);
        return indexer;
    }
    /**
     * 
     * @returns 
     */
    getAlgodClient(): algosdk.Algodv2 {
        const client = new algosdk.Algodv2(
            this.config.serverUrl,
            this.config.serverPort.toString(),
            this.config.nativeTokenSymbol
        );
        client.setIntEncoding(algosdk.IntDecoding.MIXED);
        return client;
    }
    /**
   *
   * @param key
   * @returns
   */
    getAddress(key: keyof AlgorandConfig["bridgeAccounts"]): string {
        return this.config.bridgeAccounts[key];
    }
}
