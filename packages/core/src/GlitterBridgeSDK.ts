import {GlitterEnvironment} from "src";
import {AlgorandConnect} from "./lib/chains/algorand";
import {EvmConnect} from "./lib/chains/evm";
import {SolanaConnect} from "./lib/chains/solana";
import {TronConnect} from "./lib/chains/tron/connect";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
} from "./lib/common/networks";
import {mainnetConfig, testnetConfig} from "./config";
import {GlitterBridgeConfig} from "./types";

/**
 * Glitter Bridge SDK
 */
export class GlitterBridgeSDK {
    private _environment: GlitterEnvironment | undefined;
    /** Bridge Configuration */
    private _bridgeConfig: GlitterBridgeConfig | undefined;
    /** RPC URL Override */
    private _rpcOverrides: { [key: string]: string } = {};
    /** Chain Specific SDKs */
    private _evm: Map<BridgeEvmNetworks, EvmConnect | undefined> = new Map();
    private _algorand: AlgorandConnect | undefined;
    private _solana: SolanaConnect | undefined;
    private _tron: TronConnect | undefined;

    public setEnvironment(environment: GlitterEnvironment): GlitterBridgeSDK {
        this._environment = environment;

        switch (environment) {
            case GlitterEnvironment.mainnet:
                this._bridgeConfig = mainnetConfig;
                break;
            case GlitterEnvironment.testnet:
                this._bridgeConfig = testnetConfig;
                break;
            default:
                throw new Error("Environment not found");
        }

        return this;
    }

    public setRPC(network: BridgeNetworks, rpc: string): GlitterBridgeSDK {
        this._rpcOverrides[network] = rpc;
        return this;
    }
    
    /**
     * Initialize connections and SDK
     * @param {BridgeNetworks[]} networks list of
     * networks to connect to
     * @returns {GlitterBridgeSDK}
    */
    public connect(networks: BridgeNetworks[]): GlitterBridgeSDK {
        networks.forEach((network) => {
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
                    this.connectToEvmNetwork(BridgeNetworks.Ethereum);
                    break;
                case BridgeNetworks.Polygon:
                    this.connectToEvmNetwork(BridgeNetworks.Polygon);
                    break;
                case BridgeNetworks.Avalanche:
                    this.connectToEvmNetwork(BridgeNetworks.Avalanche);
                    break;
                case BridgeNetworks.TRON:
                    this.connectToTron();
                    break;
            }});

        return this;
    }
    /**
   *
   * @param {BridgeNetworks} network
   */
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
        this._tron = new TronConnect(this._bridgeConfig!.tron);

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

        if (this._rpcOverrides[BridgeNetworks.solana]) {
            this._bridgeConfig!.solana.server = this._rpcOverrides[BridgeNetworks.solana];
        }

        this._solana = new SolanaConnect(this._bridgeConfig!.solana);
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
    get tron(): TronConnect | undefined {
        return this._tron;
    }
}
