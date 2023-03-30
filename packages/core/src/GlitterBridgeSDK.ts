import { AlgorandConnect } from "./lib/chains/algorand";
import { EvmConnect } from "./lib/chains/evm";
import { SolanaConnect } from "./lib/chains/solana";
import { TronConnect } from "./lib/chains/tron/connect";
import { BridgeToken, BridgeTokens } from "./lib/common";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
} from "./lib/common/networks/networks";
import { GlitterBridgeConfig, GlitterEnvironment } from "./lib/configs/config";
import { BridgeMainnet } from "./lib/configs/networks/mainnet";
import { BridgeTestnet } from "./lib/configs/networks/testnet";

/**
 * Glitter Bridge SDK
 */
export class GlitterBridgeSDK {
    private _environment: GlitterEnvironment | undefined;
    /** Bridge Configuration */
    private _bridgeConfig: GlitterBridgeConfig | undefined;
    /** RPC URL Override */
    private _rpcOverrides: { [key: string]: string } = {};
    private _rpc_URLS: { [key: string]: string } = {};

    /** Chain Specific SDKs */
    private _evm: Map<BridgeEvmNetworks, EvmConnect | undefined> = new Map();
    private _algorand: AlgorandConnect | undefined;
    private _solana: SolanaConnect | undefined;
    private _tron: TronConnect | undefined;

    //Setters
    public setEnvironment(environment: GlitterEnvironment): GlitterBridgeSDK {
    //Set environment
        this._environment = environment;

        switch (environment) {
            case GlitterEnvironment.mainnet:
                this._bridgeConfig = BridgeMainnet;
                break;
            case GlitterEnvironment.testnet:
                this._bridgeConfig = BridgeTestnet;
                break;
            default:
                throw new Error("Environment not found");
        }

        //Get Tokens
        const tokens: BridgeToken[] = [];
        this._bridgeConfig.algorand.tokens.forEach((token) => {
            tokens.push(token);
        });
        this._bridgeConfig.solana.tokens.forEach((token) => {
            tokens.push(token);
        });
        BridgeTokens.loadConfig(tokens);

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
            }
        });

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
        if (network === BridgeNetworks.TRON && !this._bridgeConfig.tron) {
            throw new Error(unavailableConfigError);
        } else if (
            [
                BridgeNetworks.Avalanche,
                BridgeNetworks.Ethereum,
                BridgeNetworks.Polygon,
            ].includes(network) &&
      !this._bridgeConfig.evm[network as BridgeEvmNetworks]
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
    // Failsafe
    // copy paste is an anti pattern
    // https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
        if (!this._bridgeConfig) throw new Error("Glitter environment not set");
        if (!this._bridgeConfig.algorand)
            throw new Error("Algorand environment not set");

        if (this._rpcOverrides[BridgeNetworks.algorand]) {
            console.log(
                "Algorand RPC override: " + this._rpcOverrides[BridgeNetworks.algorand]
            );
            this._bridgeConfig.algorand.serverUrl =
        this._rpcOverrides[BridgeNetworks.algorand];
        }
        
        //Get the connections
        this._algorand = new AlgorandConnect(this._bridgeConfig.algorand);

        //set the RPC URL
        this._rpc_URLS[BridgeNetworks.algorand] = this._bridgeConfig.algorand.serverUrl;

        if (!this._algorand.client) throw new Error("Algorand client not set");

        return this;
    }

    private connectToSolana(): GlitterBridgeSDK {
    //Failsafe
    // same here
        if (!this._bridgeConfig) throw new Error("Glitter environment not set");
        if (!this._bridgeConfig.solana)
            throw new Error("Solana environment not set");

        if (this._rpcOverrides[BridgeNetworks.solana]) {
            console.log(
                "Solana RPC override: " + this._rpcOverrides[BridgeNetworks.solana]
            );
            this._bridgeConfig.solana.server =
        this._rpcOverrides[BridgeNetworks.solana];
        }
      
        this._solana = new SolanaConnect(this._bridgeConfig?.solana);

        //set the RPC URL
        this._rpc_URLS[BridgeNetworks.solana] = this._bridgeConfig.solana.server;

        if (!this._solana.client) throw new Error("Solana client not set");
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
      
        //set the RPC URL
        this._rpc_URLS[BridgeNetworks.solana] = this._bridgeConfig!.evm[network].rpcUrl;

        return this;
    }

    /** Get chain specific connection */

    /**
   * Returns EVMConnect for
   * a specific evm network
   * @param {BridgeEvmNetworks} network
   * @returns {EvmConnect | undefined}
   */
    public getEvmNetwork(evmNetwork: BridgeEvmNetworks): EvmConnect | undefined {
        return this._evm.get(evmNetwork);
    }
    public getRPCUrl(network: BridgeNetworks): string | undefined {
        return this._rpc_URLS[network];
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
