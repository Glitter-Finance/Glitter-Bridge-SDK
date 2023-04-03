import * as algosdk from "algosdk";
import {AlgorandConfig} from "./types";
import {AssetsRepository} from "./AssetsRepository";
import {BridgeNetworks} from "src/lib/common/networks";
import BigNumber from "bignumber.js";
import {assetOptin, bridgeDeposit, bridgeUSDC} from "./transactions";
import SendRawTransaction from "algosdk/dist/types/client/v2/algod/sendRawTransaction";
import {
    AlgorandNativeTokenConfig,
    AlgorandStandardAssetConfig,
    BridgeTokens,
    RoutingDefault,
    Sleep,
} from "src/lib/common";
import {AlgorandAccountsStore} from "./AccountsStore";
import {Account} from "algosdk";

export class AlgorandConnect {
    public readonly clientIndexer: algosdk.Indexer;
    public readonly assetsRepo: AssetsRepository;
    public readonly config: AlgorandConfig;
    public readonly client: algosdk.Algodv2;
    public readonly accountsStore: AlgorandAccountsStore;
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

        const isUSDC = token.symbol.trim().toLowerCase() === "usdc"
        if (isUSDC) {
            return await bridgeUSDC(
                this.client,
                sourceAddress,
                destinationAdress,
                destinationNetwork,
                new BigNumber(amount.toString()),
                depositAddress,
            token as AlgorandStandardAssetConfig
            )
        }

        return await bridgeDeposit(
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
        )
        
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
            this.config.serverPort ? this.config.serverPort.toString() : undefined,
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
    /**
     * 
     * @param tokenSymbol 
     * @returns 
     */
    public getAsset(tokenSymbol: string): AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined {
        return this.assetsRepo.getAsset(tokenSymbol)
    }
    /**
     * 
     * @param address 
     * @param tokenSymbol 
     * @returns 
     */
    public async getBalance(address: string, tokenSymbol: string): Promise<{
        balanceBn: BigNumber;
        balanceHuman: BigNumber
    }> {
        const token = this.assetsRepo.getAsset(tokenSymbol) as AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
        if (!token) return Promise.reject('Asset unavailable')
        const native = token.symbol.toLowerCase() === "algo"

        return native ? await this.accountsStore.getAlgoBalance(
            address
        ) : this.accountsStore.getStandardAssetBalance(
            address,
            token as AlgorandStandardAssetConfig
        )
    }
    /**
     * 
     * @param address 
     * @param tokenSymbol 
     * @param startingAmount 
     * @param timeoutSeconds 
     * @returns 
     */
    public async waitForBalanceChange(address: string, tokenSymbol: string, startingAmount: number, timeoutSeconds = 60): Promise<number> {
        const start = Date.now();
        let balance = await this.getBalance(address, tokenSymbol)

        for (let i = 0; i <= timeoutSeconds; i++) {
            if (balance.balanceHuman.toNumber() != startingAmount) {
                break;
            }

            if (Date.now() - start > timeoutSeconds * 1000) {
                return Promise.reject(new Error('WaitForBalanceChange Timeout'));
            }

            await Sleep(1000);
            balance = await this.getBalance(address, tokenSymbol);
        }

        return balance.balanceHuman.toNumber();
    }
    /**
     * 
     * @param address 
     * @param minAmount 
     * @param tokenSymbol 
     * @param timeoutSeconds 
     * @returns 
     */
    public async waitForMinBalance(address: string, minAmount: number, tokenSymbol: string, timeoutSeconds = 60): Promise<number> {
        const start = Date.now();
        let balance = await this.getBalance(address, tokenSymbol);

        for (let i = 0; i <= timeoutSeconds; i++) {
            if (balance.balanceHuman.toNumber() != minAmount) {
                break;
            }

            if (Date.now() - start > timeoutSeconds * 1000) {
                return Promise.reject(new Error('waitForMinBalance Timeout'))
            }

            await Sleep(1000);
            balance = await this.getBalance(address, tokenSymbol);
        }

        return balance.balanceHuman.toNumber();
    }
    /**
     * 
     * @param address 
     * @param expectedAmount 
     * @param tokenSymbol 
     * @param timeoutSeconds 
     * @param threshold 
     * @param anybalance 
     * @param noBalance 
     * @returns 
     */
    public async waitForBalance(
        address: string,
        expectedAmount: number,
        tokenSymbol: string,
        timeoutSeconds = 60,
        threshold = 0.001,
        anybalance = false,
        noBalance = false
    ): Promise<number> {
        const start = Date.now();
        let balance = await this.getBalance(address, tokenSymbol);
        for (let i = 0; i <= timeoutSeconds; i++) {
            if (anybalance && balance.balanceHuman.gt(0)) {
                break;
            } else if (noBalance && balance.balanceHuman.eq(0)) {
                break;
            } else if (Math.abs(balance.balanceHuman.toNumber() - expectedAmount) < threshold) {
                break;
            }

            if (Date.now() - start > timeoutSeconds * 1000) {
                return Promise.reject(new Error('waitForBalance Timeout'))
            }

            await Sleep(1000);
            balance = await this.getBalance(address, tokenSymbol);
        }

        return balance.balanceHuman.toNumber();
    }
    /**
     * 
     * @param signer 
     * @param tokenSymbol 
     * @returns 
     */
    async optinToken(signer: Account, tokenSymbol: string): Promise<string> {
        const token = this.getAsset(tokenSymbol);
        if (!token || !(token as AlgorandStandardAssetConfig).assetId) return Promise.reject(new Error("Unsupported token"));

        const txn = await assetOptin(
            this.client,
            signer.addr.toString(),
            token as AlgorandStandardAssetConfig
        )

        const [txID] = await this.accountsStore.signAndSendTransactions(
            [txn],
            signer
        )

        return txID
    }
}
