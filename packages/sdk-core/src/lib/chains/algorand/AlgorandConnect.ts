import * as algosdk from "algosdk";
import BigNumber from "bignumber.js";
import {
    AlgorandNativeTokenConfig,
    AlgorandStandardAssetConfig,
    BridgeTokens,
    RoutingDefault,
    Sleep,
} from "../../../lib/common";
import { BridgeNetworks } from "../../../lib/common/networks";
import { AlgorandAccountsStore } from "./AccountsStore";
import { AssetsRepository } from "./AssetsRepository";
import { assetOptin, bridgeDeposit, bridgeUSDC } from "./transactions";
import { AlgorandConfig } from "./types";

/**
 * Class representing the Algorand connection.
 */
export class AlgorandConnect {
    /**
     * The Algorand Indexer client.
     * @type {algosdk.Indexer}
     */
    public readonly clientIndexer: algosdk.Indexer;
  
    /**
     * The Assets repository.
     * @type {AssetsRepository}
     */
    public readonly assetsRepo: AssetsRepository;
  
    /**
     * The Algorand configuration object.
     * @type {AlgorandConfig}
     */
    public readonly config: AlgorandConfig;
  
    /**
     * The Algorand client instance.
     * @type {algosdk.Algodv2}
     */
    public readonly client: algosdk.Algodv2;
  
    /**
     * The Algorand accounts store.
     * @type {AlgorandAccountsStore}
     */
    public readonly accountsStore: AlgorandAccountsStore;

    /**
     * Create an instance of AlgorandConnect.
     * @param {AlgorandConfig} config - The Algorand configuration object.
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
                return this.assetsRepo.addStandardAsset(
                    conf
                );
            }
        );
    }

    /**
     * Initiates bridge transactions to transfer tokens from the source network to the destination network.
     *
     * @param {string} sourceAddress - The source address on the source network.
     * @param {string} destinationAddress - The destination address on the destination network.
     * @param {BridgeNetworks} destinationNetwork - The destination network type.
     * @param {string} tokenSymbol - The symbol of the token being transferred.
     * @param {bigint} amount - The amount of tokens to be transferred (as a BigInt).
     * @returns {Promise<algosdk.Transaction[]>} - A promise that resolves with an array of bridge transactions.
     */
    public async bridgeTransactions(
        sourceAddress: string,
        destinationAddress: string,
        destinationNetwork: BridgeNetworks,
        tokenSymbol: string,
        amount: bigint
    ): Promise<algosdk.Transaction[]> {
        const token = BridgeTokens.getToken(BridgeNetworks.algorand, tokenSymbol);
        if (!token) return Promise.reject("Token unsupported");

        const depositAddress = this.config.bridgeAccounts.usdcDeposit;
        const routing = RoutingDefault();
        routing.from.address = sourceAddress;
        routing.from.token = tokenSymbol;
        routing.from.network = BridgeNetworks.algorand.toString().toLowerCase();
        routing.to.address = destinationAddress;
        routing.to.token = token.wrappedSymbol ?? token.symbol;
        routing.to.network = destinationNetwork.toString().toLowerCase();
        routing.amount = new BigNumber(amount.toString()).div(
            10 ** token.decimals
        ).dp(2);
        routing.units = new BigNumber(amount.toString());

        const isUSDC = token.symbol.trim().toLowerCase() === "usdc"
        if (isUSDC) {
            return await bridgeUSDC(
                this.client,
                sourceAddress,
                destinationAddress,
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
            destinationAddress,
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
     * Retrieves the Algod Indexer instance.
     *
     * @returns {algosdk.Indexer} - The Algod Indexer instance.
     */
    getAlgodIndexer(): algosdk.Indexer {
        const indexer = new algosdk.Indexer(
            {},
            this.config.indexerUrl,
            this.config.indexerPort ?? ""
        );
        indexer.setIntEncoding(algosdk.IntDecoding.MIXED);
        return indexer;
    }
    
    /**
     * Retrieves the Algod client instance.
     *
     * @returns {algosdk.Algodv2} - The Algod client instance.
     */
    getAlgodClient(): algosdk.Algodv2 {
        const client = new algosdk.Algodv2(
            {},
            this.config.serverUrl,
            this.config.serverPort ?? ""
        );
        client.setIntEncoding(algosdk.IntDecoding.MIXED);
        return client;
    }

    /**
     * Retrieves the address corresponding to a specified key from the bridge accounts configuration.
     *
     * @param {string} key - The key for the bridge account address.
     * @returns {string} - The address corresponding to the specified key.
     */
    getAddress(key: keyof AlgorandConfig["bridgeAccounts"]): string {
        return this.config.bridgeAccounts[key];
    }

    /**
     * Retrieves the asset configuration for a specified token symbol.
     *
     * @param {string} tokenSymbol - The symbol of the token.
     * @returns {AlgorandStandardAssetConfig|AlgorandNativeTokenConfig|undefined} - The asset configuration for the specified token symbol, or undefined if not found.
     */
    public getAsset(tokenSymbol: string): AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined {
        return this.assetsRepo.getAsset(tokenSymbol)
    }

    /**
     * Retrieves the balance of a specified token for a given address.
     *
     * @param {string} address - The address for which to retrieve the token balance.
     * @param {string} tokenSymbol - The symbol of the token.
     * @returns {Promise<{ balanceHuman: BigNumber, balanceBn: BigNumber }>} - A promise that resolves with the token balance in both human-readable and BigNumber format.
     */
    public async getBalance(address: string, tokenSymbol: string): Promise<{
        balanceBn: BigNumber;
        balanceHuman: BigNumber
    }> {
        const token = BridgeTokens.getToken(BridgeNetworks.algorand, tokenSymbol) as AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
        if (!token) {
            throw new Error('Asset unavailable')
        }

        const native = token.symbol.toLowerCase() === "algo"

        return native ? await this.accountsStore.getAlgoBalance(
            address
        ) : this.accountsStore.getStandardAssetBalance(
            address,
            token as AlgorandStandardAssetConfig
        )
    }
    
    /**
     * Waits for the balance of a specified token for a given address to change from the starting amount.
     *
     * @param {string} address - The address for which to wait for the balance change.
     * @param {string} tokenSymbol - The symbol of the token.
     * @param {number} startingAmount - The starting balance amount to compare against.
     * @param {number} [timeoutSeconds=60] - The timeout duration in seconds.
     * @returns {Promise<number>} - A promise that resolves with the updated balance amount after the change.
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
     * Waits for the balance of a specified token for a given address to reach or exceed the minimum amount.
     *
     * @param {string} address - The address for which to wait for the minimum balance.
     * @param {number} minAmount - The minimum balance amount to wait for.
     * @param {string} tokenSymbol - The symbol of the token.
     * @param {number} [timeoutSeconds=60] - The timeout duration in seconds.
     * @returns {Promise<number>} - A promise that resolves with the updated balance amount after reaching or exceeding the minimum.
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
     * Waits for the balance of a specified token for a given address to match the expected amount within a timeout period.
     *
     * @param {string} address - The address for which to wait for the balance.
     * @param {number} expectedAmount - The expected balance amount to wait for.
     * @param {string} tokenSymbol - The symbol of the token.
     * @param {number} [timeoutSeconds=60] - The timeout duration in seconds.
     * @param {number} [threshold=0.001] - The threshold to consider the balance amount as a match.
     * @param {boolean} [anybalance=false] - If true, waits for any balance change (greater or smaller) to match the expected amount.
     * @param {boolean} [noBalance=false] - If true, waits for no balance (zero) to match the expected amount.
     * @returns {Promise<number>} - A promise that resolves with the updated balance amount that matches the expected amount.
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
     * Generates an opt-in transaction for a specified token symbol.
     *
     * @param {string} signerAddress - The address of the account performing the opt-in.
     * @param {string} tokenSymbol - The symbol of the token to opt-in.
     * @returns {Promise<algosdk.Transaction>} - A promise that resolves with the opt-in transaction.
     */
    async optinTransaction(signerAddress: string, tokenSymbol: string): Promise<algosdk.Transaction> {
        const token = this.getAsset(tokenSymbol);
        if (!token || !(token as AlgorandStandardAssetConfig).assetId) return Promise.reject(new Error("Unsupported token"));

        const txn = await assetOptin(
            this.client,
            signerAddress,
            token as AlgorandStandardAssetConfig
        )

        return txn
    }

    /**
     * Performs an opt-in operation for a specified token symbol.
     *
     * @param {string} signerAddress - The address of the account performing the opt-in.
     * @param {string} tokenSymbol - The symbol of the token to opt-in.
     * @returns {Promise<string>} - A promise that resolves with the result of the opt-in operation.
     */
    async optin(signerAddress: string, tokenSymbol: string): Promise<string> {
        const txn = await this.optinTransaction(
            signerAddress,
            tokenSymbol
        )

        const [txID] = await this.accountsStore.signAndSendTransactions(
            [txn],
            signerAddress
        )

        return txID
    }

    /**
     * Checks if a specified address is opted-in to a given asset.
     *
     * @param {number} assetId - The ID of the asset.
     * @param {string} address - The address to check.
     * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the address is opted-in to the asset.
     */
    async isOptedIn(assetId: number, address: string): Promise<boolean> {
        const accountInfo = await this.accountsStore.getAccountInfo(address)
        return !!accountInfo.assets.find(x => x["asset-id"] === assetId)
    }
}
