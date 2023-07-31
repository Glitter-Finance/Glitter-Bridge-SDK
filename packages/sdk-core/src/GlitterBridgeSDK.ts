import { mainnetConfig, mainnetTokenConfig, testnetConfig, testnetTokenConfig } from "./config";
import { testnetAPI } from "./config/testnet-api";
import { BridgeType, Token2ChainConfig, Token2Config } from "./lib";
import { AlgorandConnect } from "./lib/chains/algorand";
import { EvmConnect } from "./lib/chains/evm";
import { LoadSolanaSchema, SolanaConnect } from "./lib/chains/solana";
import { TronConnect } from "./lib/chains/tron/connect";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
} from "./lib/common/networks";
import { TokenPricing } from "./lib/common/pricing/tokenPricing";
import { BridgeV2Tokens } from "./lib/common/tokens/BridgeV2Tokens";
import { ChainRPCConfig, ChainRPCConfigs, GlitterBridgeConfig, GlitterEnvironment } from "./types";

/**
 * GlitterBridgeSDK
 * Provides access to bridging on all supported chains
 */
export class GlitterBridgeSDK {

    private _environment: GlitterEnvironment | undefined;
    /** Bridge Configuration */

    private _bridgeConfig: GlitterBridgeConfig | undefined;

    /** RPC URL Override */

    private _rpcOverrides: { [key: string]: string } = {};
    private _rpcOverridesByChain = new Map<BridgeNetworks, ChainRPCConfig>();
    private _rpcList: ChainRPCConfigs | undefined;

    /** Chain Specific SDKs */
    private _evm: Map<BridgeEvmNetworks, EvmConnect | undefined> = new Map();
    private _algorand: AlgorandConnect | undefined;
    private _solana: SolanaConnect | undefined;
    private _tron: TronConnect | undefined;
    private _pricing: TokenPricing | undefined;

    /**
     * Sets the environment for the Glitter Bridge SDK.
     *
     * @param {GlitterEnvironment} environment - The environment to set for the SDK.
     * @returns {GlitterBridgeSDK} The updated GlitterBridgeSDK instance.
     */
    public setEnvironment(environment: GlitterEnvironment): GlitterBridgeSDK {
        this._environment = environment;

        switch (environment) {
            case GlitterEnvironment.mainnet:
                this._bridgeConfig = mainnetConfig;
                BridgeV2Tokens.loadConfig(mainnetTokenConfig);
                break;
            case GlitterEnvironment.testnet:
                this._bridgeConfig = testnetConfig;
                this._rpcList = testnetAPI;
                BridgeV2Tokens.loadConfig(testnetTokenConfig);
                break;
            default:
                throw new Error("Environment not found");
        }

        return this;
    }

    /**
     * Sets the RPC URL for a specific network in the Glitter Bridge SDK.
     *
     * @param {BridgeNetworks} network - The network for which to set the RPC URL.
     * @param {string} rpcUrl - The RPC URL to set for the specified network.
     * @returns {GlitterBridgeSDK} The updated GlitterBridgeSDK instance.
     */
    public setRPC(network: BridgeNetworks, rpcUrl: string): GlitterBridgeSDK {
        this._rpcOverrides[network] = rpcUrl;
        return this;
    }

    /**
     * Connects the Glitter Bridge SDK to the specified networks using their default RPC configurations or custom RPC configurations if provided.
     *
     * @param {BridgeNetworks[]} networks - An array of networks to connect to.
     * @param {ChainRPCConfigs} [rpcListOverride] - Optional custom RPC configurations to override the default RPC configurations for the networks.
     * @returns {GlitterBridgeSDK} The connected GlitterBridgeSDK instance.
     */
    public connect(networks: BridgeNetworks[], rpcListOverride?: ChainRPCConfigs): GlitterBridgeSDK {

        if (rpcListOverride) this._rpcList = rpcListOverride;
        TokenPricing.loadConfig(this._rpcList?.CMC_API || "");

        //set rpc overrides by chain
        this._rpcList?.chainAPIs.forEach((config) => {
            this._rpcOverridesByChain.set(config.network, config);
        });

        networks.forEach((network) => {

            //Get rpcoverride for the network
            this._rpcOverrides[network] = this._rpcList?.chainAPIs.find((chain) => chain.network.toLocaleLowerCase() === network.toLocaleLowerCase())?.RPC || this._rpcOverrides[network];

            /**
             * TODO: Have a single method
             * for each chain e.g
             * interface ChainConnect { connect(network: BridgeNetworks): void; }
             */
            switch (network) {
                case BridgeNetworks.algorand:
                    this.connectToAlgorand();
                    break;
                case BridgeNetworks.solana:
                    this.connectToSolana();
                    break;
                case BridgeNetworks.Ethereum:
                case BridgeNetworks.Polygon:
                case BridgeNetworks.Avalanche:
                case BridgeNetworks.Arbitrum:
                case BridgeNetworks.Binance:
                case BridgeNetworks.Zkevm:
                case BridgeNetworks.Optimism:
                    this.connectToEvmNetwork(network);
                    break;
                case BridgeNetworks.TRON:
                    this.connectToTron();
                    break;
            }
        });

        return this;
    }

    /**
     * Performs pre-initialization checks for the specified network.
     *
     * @private
     * @param {BridgeNetworks} network - The network to perform pre-initialization checks for.
     * @returns {void}
     */
    private preInitializeChecks(network: BridgeNetworks) {
        if (!this._bridgeConfig || !BridgeV2Tokens.isLoaded) throw new Error("Glitter environment not set");
        /**
         * TODO: have config keys in such
         * a way that we directly check
         * using JS this._bridgeConfig[network]
         */
        const unavailableConfigError = `${network} Configuration unavailable`;
        const isEvmInvalid = [BridgeNetworks.Avalanche, BridgeNetworks.Ethereum, BridgeNetworks.Polygon].includes(network) && !this._bridgeConfig.evm[network as BridgeEvmNetworks]
        const isTronInvalid = network === BridgeNetworks.TRON && !this._bridgeConfig.tron
        const isSolInvalid = network === BridgeNetworks.solana && !this._bridgeConfig.solana
        const isAlgoInvalid = network === BridgeNetworks.algorand && !this._bridgeConfig.algorand
        if (
            isEvmInvalid || isTronInvalid || isSolInvalid || isAlgoInvalid
        ) {
            throw new Error(unavailableConfigError);
        }
    }

    /**
     * Connects to the Tron network.
     *
     * @private
     * @returns {GlitterBridgeSDK} - The GlitterBridgeSDK instance.
     */
    private connectToTron(): GlitterBridgeSDK {
        this.preInitializeChecks(BridgeNetworks.TRON);

        if (this._rpcOverrides[BridgeNetworks.TRON]) {
            this._bridgeConfig!.tron.fullNode = this._rpcOverrides[BridgeNetworks.TRON];
            this._bridgeConfig!.tron.solidityNode = this._rpcOverrides[BridgeNetworks.TRON];
            this._bridgeConfig!.tron.eventServer = this._rpcOverrides[BridgeNetworks.TRON];
        }
        this._tron = new TronConnect(this._bridgeConfig!.tron);

        const APIKey = this._rpcOverridesByChain.get(BridgeNetworks.TRON)?.API_KEY;
        if (APIKey && APIKey != "") this._tron.setApiKey(APIKey || "");

        return this;
    }

    /**
     * Connects to the Algorand network.
     *
     * @private
     * @returns {GlitterBridgeSDK} - The GlitterBridgeSDK instance.
     */
    private connectToAlgorand(): GlitterBridgeSDK {
        this.preInitializeChecks(BridgeNetworks.algorand)

        if (this._rpcOverrides[BridgeNetworks.algorand]) {
            this._bridgeConfig!.algorand.serverUrl = this._rpcOverrides[BridgeNetworks.algorand];
        }

        this._algorand = new AlgorandConnect(this._bridgeConfig!.algorand);

        return this;
    }

    /**
     * Connects to the Solana network.
     *
     * @private
     * @returns {GlitterBridgeSDK} - The GlitterBridgeSDK instance.
     */
    private connectToSolana(): GlitterBridgeSDK {
        this.preInitializeChecks(BridgeNetworks.solana);

        LoadSolanaSchema();

        if (this._rpcOverrides[BridgeNetworks.solana]) {
            this._bridgeConfig!.solana.server = this._rpcOverrides[BridgeNetworks.solana];
        }

        this._solana = new SolanaConnect(this._bridgeConfig!);
        return this;
    }

    /**
     * Connects to the specified EVM network.
     *
     * @private
     * @param {BridgeEvmNetworks} network - The EVM network to connect to.
     * @returns {GlitterBridgeSDK} - The GlitterBridgeSDK instance.
     */
    private connectToEvmNetwork(network: BridgeEvmNetworks): GlitterBridgeSDK {
        this.preInitializeChecks(network);

        if (this._rpcOverrides[network]) {
            this._bridgeConfig!.evm[network].rpcUrl = this._rpcOverrides[network];
        }

        this._evm.set(
            network,
            new EvmConnect(network, this._bridgeConfig!.evm[network], this.getV2EvmTokens(network))
        );
        return this;
    }

    private getV2EvmTokens(network: BridgeEvmNetworks): Token2ChainConfig[] {
        const tokenList = BridgeV2Tokens.getTokenList();
        return tokenList?.reduce((acc, x) => {
            const inNetwork = x.chains.find(chain => chain.chain.toLowerCase() === network.toLowerCase());
            if (inNetwork) {
                acc.push(inNetwork);
            }
            return acc;
        }, [] as Token2ChainConfig[]) ?? [];
    }

    /**
     * Retrieves the EVM network configuration for the specified EVM network.
     *
     * @param {BridgeEvmNetworks} evmNetwork - The EVM network.
     * @returns {EvmConnect | undefined} - The EVM network configuration, or undefined if not found.
     */
    public getEvmNetwork(evmNetwork: BridgeEvmNetworks): EvmConnect | undefined {
        let connect = this._evm.get(evmNetwork);
        if (!connect) {
            //loop through all evm networks enum values

            Object.values(BridgeNetworks).forEach((network) => {
                if (network.toLocaleLowerCase() === evmNetwork.toLocaleLowerCase()) {
                    connect = this._evm.get(network as BridgeEvmNetworks);
                    return;
                }
            });
        }

        return connect;
    }

    /**
     * Retrieves the current Glitter environment.
     *
     * @returns {GlitterEnvironment | undefined} - The current Glitter environment, or undefined if not set.
     */
    get environment(): GlitterEnvironment | undefined {
        return this._environment;
    }

    /**
     * Retrieves the Algorand connection.
     *
     * @returns {AlgorandConnect | undefined} - The Algorand connection or undefined if not available.
     */
    get algorand(): AlgorandConnect | undefined {
        return this._algorand;
    }

    /**
     * Retrieves the Solana connection.
     *
     * @returns {SolanaConnect | undefined} - The Solana connection or undefined if not available.
     */
    get solana(): SolanaConnect | undefined {
        return this._solana;
    }

    /**
     * Retrieves the Ethereum connection.
     *
     * @returns {EvmConnect | undefined} - The Ethereum connection or undefined if not available.
     */
    get ethereum(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Ethereum);
    }

    /**
     * Retrieves the Polygon connection.
     *
     * @returns {EvmConnect | undefined} - The Polygon connection or undefined if not available.
     */
    get polygon(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Polygon);
    }

    /**
     * Retrieves the Avalanche connection.
     *
     * @returns {EvmConnect | undefined} - The Avalanche connection or undefined if not available.
     */
    get avalanche(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Avalanche);
    }

    /**
     * Retrieves the Arbitrum connection.
     *
     * @returns {EvmConnect | undefined} - The Arbitrum connection or undefined if not available.
     */
    get arbitrum(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Arbitrum);
    }

    /**
     * Retrieves the Binance connection.
     *
     * @returns {EvmConnect | undefined} - The Binance connection or undefined if not available.
     */
    get binance(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Binance);
    }

    /**
     * Retrieves the Zkevm connection.
     *
     * @returns {EvmConnect | undefined} - The Zkevm connection or undefined if not available.
     */
    get zkevm(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Zkevm);
    }

    /**
     * Retrieves the Optimism connection.
     *
     * @returns {EvmConnect | undefined} - The Optimism connection or undefined if not available.
     */
    get optimism(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Optimism);
    }

    /**
     * Retrieves the Tron connection.
     *
     * @returns {TronConnect | undefined} - The Tron connection or undefined if not available.
     */
    get tron(): TronConnect | undefined {
        return this._tron;
    }

    /**
     * Retrieves the RPC list configuration.
     *
     * @returns {ChainRPCConfigs | undefined} - The RPC list configuration or undefined if not available.
     */
    get rpcList(): ChainRPCConfigs | undefined {
        return this._rpcList;
    }

    /**
     * Retrieves the number of confirmations required for the specified chain or network.
     *
     * @param {string | BridgeNetworks} chainOrName - The chain name or BridgeNetworks value.
     * @returns {number} - The number of confirmations required.
     */
    public confirmationsRequired(chainName: string, bridgeType?: BridgeType): number
    public confirmationsRequired(chain: string, bridgeType?: BridgeType): number
    public confirmationsRequired(chainOrName: BridgeNetworks, bridgeType?: BridgeType): number {

        let confirmations = 0;

        if (bridgeType === BridgeType.TokenV2) {
            confirmations = this._bridgeConfig?.confirmationsV2[chainOrName] || 0;
        } else {
            confirmations = this._bridgeConfig?.confirmationsCircle[chainOrName] || 0;
        }
        if (confirmations > 0) return confirmations;

        //parse through confirmation pairs
        for (const [chain, localconfirmations] of Object.entries(this._bridgeConfig?.confirmationsV2 || {})) {
            if (chain.toLowerCase() === chainOrName.toLowerCase()) {
                return localconfirmations;
            }
        }

        for (const [chain, localconfirmations] of Object.entries(this._bridgeConfig?.confirmationsCircle || {})) {
            if (chain.toLowerCase() === chainOrName.toLowerCase()) {
                return localconfirmations;
            }
        }

        return 0;
    }

    /**
     * Retrieves the gas token configuration for the specified chain or network.
     *
     * @param {string | BridgeNetworks} chainOrName - The chain name or BridgeNetworks value.
     * @returns {Token2Config | undefined} - The gas token configuration, or undefined if not found.
     */
    public gasToken(chainName: string): Token2Config
    public gasToken(chain: string): Token2Config
    public gasToken(chainOrName: BridgeNetworks): Token2Config | undefined {

        //get gas token from config
        let gasToken = this._bridgeConfig?.gasTokens[chainOrName];
        if (!gasToken) {
            //parse through gas token pairs
            for (const [chain, localgasToken] of Object.entries(this._bridgeConfig?.gasTokens || {})) {
                if (chain.toLowerCase() === chainOrName.toLowerCase()) {
                    gasToken = localgasToken;
                }
            }
        }

        let gasTokenConfig = BridgeV2Tokens.getTokenConfig(gasToken || "");
        if (!gasTokenConfig) {
            gasTokenConfig = BridgeV2Tokens.getTokenConfigFromChildSymbol(gasToken || "");
        }

        return gasTokenConfig;
    }

}
