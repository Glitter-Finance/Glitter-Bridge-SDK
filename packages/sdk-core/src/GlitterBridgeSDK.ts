import { AlgorandConnect } from "./lib/chains/algorand";
import { EvmConnect } from "./lib/chains/evm";
import { LoadSolanaSchema, SolanaConnect } from "./lib/chains/solana";
import { TronConnect } from "./lib/chains/tron/connect";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
} from "./lib/common/networks";
import { mainnetConfig, testnetConfig, mainnetTokenConfig, testnetTokenConfig } from "./config";
import { ChainRPCConfig, ChainRPCConfigs, GlitterBridgeConfig, GlitterEnvironment } from "./types";
import { BridgeV2Tokens } from "./lib/common/tokens/BridgeV2Tokens";
import { testnetAPI } from "./config/testnet-api";
import { BridgeTokenConfig, Token2Config } from "./lib";

/**
 * GlitterBridgeSDK
 * Provides access to bridging
 * on all supported chains
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
    
    /**
     * Set environment of the SDK
     * @param {GlitterEnvironment} environment 
     * @returns {GlitterBridgeSDK}
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
     * Set RPC Override for the network
     * @param {BridgeNetworks} network 
     * @param {string} rpcUrl
     * @returns {GlitterBridgeSDK}
     */
    public setRPC(network: BridgeNetworks, rpcUrl: string): GlitterBridgeSDK {
        this._rpcOverrides[network] = rpcUrl;
        return this;
    }
    /**
     * Initialize connections and SDK
     * @param {BridgeNetworks[]} networks list of
     * networks to connect to
     * @returns {GlitterBridgeSDK}
    */
    public connect(networks: BridgeNetworks[], rpcListOverride?:ChainRPCConfigs): GlitterBridgeSDK {

        if (rpcListOverride) this._rpcList = rpcListOverride;

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
            }});

        return this;
    }

    private preInitializeChecks(network: BridgeNetworks) {
        if (!this._bridgeConfig) throw new Error("Glitter environment not set");
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

    private connectToAlgorand(): GlitterBridgeSDK {
        this.preInitializeChecks(BridgeNetworks.algorand)

        if (this._rpcOverrides[BridgeNetworks.algorand]) {
            this._bridgeConfig!.algorand.serverUrl = this._rpcOverrides[BridgeNetworks.algorand];
        }

        this._algorand = new AlgorandConnect(this._bridgeConfig!.algorand);

        return this;
    }

    private connectToSolana(): GlitterBridgeSDK {
        this.preInitializeChecks(BridgeNetworks.solana);
        
        LoadSolanaSchema();

        if (this._rpcOverrides[BridgeNetworks.solana]) {
            this._bridgeConfig!.solana.server = this._rpcOverrides[BridgeNetworks.solana];
        }

        this._solana = new SolanaConnect(this._bridgeConfig!);
        return this;
    }

    private connectToEvmNetwork(network: BridgeEvmNetworks): GlitterBridgeSDK {
        this.preInitializeChecks(network);

        if (this._rpcOverrides[network]) {
      this._bridgeConfig!.evm[network].rpcUrl = this._rpcOverrides[network];
        }

        this._evm.set(
            network,
            new EvmConnect(network, this._bridgeConfig!.evm[network])
        );
        return this;
    }

    /**
     * Returns EVMConnect for
     * a specific evm network
     * @param {BridgeEvmNetworks} network
     * @returns {EvmConnect | undefined}
     */
    public getEvmNetwork(evmNetwork: BridgeEvmNetworks): EvmConnect | undefined {
        return this._evm.get(evmNetwork);
    }

    get environment(): GlitterEnvironment | undefined {
        return this._environment;
    }
    get algorand(): AlgorandConnect | undefined {
        return this._algorand;
    }
    get solana(): SolanaConnect | undefined {
        return this._solana;
    }
    get ethereum(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Ethereum);
    }
    get polygon(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Polygon);
    }
    get avalanche(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Avalanche);
    }
    get arbitrum(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Arbitrum);
    }
    get binance(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Binance);
    }
    get zkevm(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Zkevm);
    }
    get optimism(): EvmConnect | undefined {
        return this._evm.get(BridgeNetworks.Optimism);
    }
    get tron(): TronConnect | undefined {
        return this._tron;
    }

    get rpcList(): ChainRPCConfigs|undefined {
        return this._rpcList;
    }

    public confirmationsRequired(chainName: string): number 
    public confirmationsRequired(chain: string): number 
    public confirmationsRequired(chainOrName: BridgeNetworks): number {

        const confirmations = this._bridgeConfig?.confirmations[chainOrName] || 0;
        if (confirmations > 0) return confirmations;
        
        //parse through confirmation pairs
        for (const [chain, confirmations] of Object.entries(this._bridgeConfig?.confirmations || {})) {
            if (chain.toLowerCase() === chainOrName.toLowerCase()) {
                return confirmations;
            }
        }       

        return 0;
    }

    public gasToken(chainName: string): Token2Config 
    public gasToken(chain: string): Token2Config 
    public gasToken(chainOrName: BridgeNetworks): Token2Config|undefined {

        //get gas token from config
        let gasToken = this._bridgeConfig?.gasTokens[chainOrName];
        if (!gasToken) {
            //parse through gas token pairs
            for (const [chain, localgasToken] of Object.entries(this._bridgeConfig?.gasTokens || {})) {
                if (chain.toLowerCase() === chainOrName.toLowerCase()) {
                    gasToken= localgasToken;
                }
            }
        }

        return BridgeV2Tokens.getTokenConfig(gasToken || "");       
    }

}
