import * as algosdk from "algosdk";
import {Account, Transaction} from "algosdk";
import {
    AlgorandConfig,
    AlgorandAssetConfig,
    AlgorandStandardAssetConfig,
} from "./types";
import {AssetsRepository} from "./AssetsRepository";
import {BridgeNetworks} from "src/lib/common/networks/networks";
import BigNumber from "bignumber.js";
import {bridgeDeposit, bridgeUSDC} from "./transactions";
import SendRawTransaction from "algosdk/dist/types/client/v2/algod/sendRawTransaction";
import {RoutingDefault} from "src/lib/common";
import {AlgorandAccountsStore} from "./AccountsStore";

export class AlgorandConnect {
    public readonly clientIndexer: algosdk.Indexer;
    public readonly assetsRepo: AssetsRepository;
    public readonly config: AlgorandConfig;
    public readonly client: algosdk.Algodv2;
    public readonly accountsStore: AlgorandAccountsStore;
    _lastTxnHash = "";

    constructor(config: AlgorandConfig) {
        this.config = config;
        this.client = this.getAlgodClient();
        this.clientIndexer = this.getAlgodIndexer();
        this.assetsRepo = new AssetsRepository(this.client);
        this.accountsStore = new AlgorandAccountsStore(this.client);

        config.assets.map(
            (conf: AlgorandStandardAssetConfig | AlgorandAssetConfig) => {
                if ((conf as AlgorandStandardAssetConfig).assetId) {
                    this.assetsRepo.addStandardAsset(
                        (conf as AlgorandStandardAssetConfig).assetId,
                        conf
                    );
                }
            }
        );
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
    public async bridgeTransactions(
        sourceAddress: string,
        destinationNetwork: BridgeNetworks,
        destinationAdress: string,
        tokenSymbol: string,
        amount: bigint
    ): Promise<algosdk.Transaction[]> {
        const token = this.assetsRepo.get(tokenSymbol);
        if (!token) return Promise.reject("Token unsupported");

        const depositAddress = this.config.bridgeAccounts.usdcDeposit;
        const routing = RoutingDefault();
        routing.from.address = sourceAddress;
        routing.from.token = tokenSymbol;
        routing.from.network = BridgeNetworks.algorand.toString().toLowerCase();
        routing.to.address = destinationAdress;
        routing.to.token = token.destinationSymbol[destinationNetwork];
        routing.to.network = destinationNetwork.toString().toLowerCase();
        routing.amount = new BigNumber(amount.toString());

        const transactions =
      (await token.symbol.trim().toLowerCase()) === "usdc"
          ? bridgeUSDC(
              this.client,
              sourceAddress,
              destinationAdress,
              destinationNetwork,
              new BigNumber(amount.toString()),
              depositAddress,
            token as AlgorandStandardAssetConfig
          )
          : bridgeDeposit(
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
   * @param transactions
   * @param signer
   * @returns
   */
    async signAndSendTransactions(
        transactions: Transaction[],
        signer: Account
    ): Promise<SendRawTransaction> {
        if (transactions.length == 0)
            throw new Error(
                "Transactions array should contain one or more transactions."
            );
        if (transactions.length > 4)
            throw new Error("Maximum of 4 transactions can be sent at a time.");

        const signedTxns: Uint8Array[] = [];
        const groupID = algosdk.computeGroupID(transactions);

        for (let i = 0; i < transactions.length; i++) {
            transactions[i].group = groupID;
            const signedTxn: Uint8Array = transactions[i].signTxn(signer.sk);
            signedTxns.push(signedTxn);
        }

        const txnResult: SendRawTransaction = await this.client
            .sendRawTransaction(signedTxns)
            .do();
        await algosdk.waitForConfirmation(
            this.client,
            transactions[0].txID().toString(),
            4
        );
        return txnResult;
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

    getAlgodIndexer(): algosdk.Indexer {
        const indexer = new algosdk.Indexer(
            this.config.indexerUrl,
            this.config.indexerUrl,
            this.config.nativeTokenSymbol
        );
        indexer.setIntEncoding(algosdk.IntDecoding.MIXED);
        return indexer;
    }

    getAlgodClient(): algosdk.Algodv2 {
        const client = new algosdk.Algodv2(
            this.config.serverUrl,
            this.config.serverPort.toString(),
            this.config.nativeTokenSymbol
        );
        client.setIntEncoding(algosdk.IntDecoding.MIXED);
        return client;
    }
}
