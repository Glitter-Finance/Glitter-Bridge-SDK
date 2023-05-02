import {
    BridgeNetworks,
    ChainRPCConfig,
    ChainRPCConfigs,
    GlitterBridgeSDK,
    GlitterEnvironment,
} from "@glitter-finance/sdk-core";
import { GlitterPoller } from "./common/poller.Interface";
import { GlitterAlgorandPoller } from "./chains/algorand/poller.algorand";
import { GlitterSolanaPoller } from "./chains/solana/poller.solana";
import { GlitterEVMPoller } from "./chains/evm/poller.evm";

//Configs
//import { ChainAPIConfig, GlitterServerConfig } from "../configs/config";
//import { ServerTestnet } from "../configs/networks/testnet";

export class GlitterSDKServer {

    //Local Params
    private _sdk: GlitterBridgeSDK = new GlitterBridgeSDK();
    private _pollers: Map<BridgeNetworks, GlitterPoller> = new Map< BridgeNetworks, GlitterPoller >();
    private _defaultLimit = 5;
    // private _serverConfig: GlitterServerConfig;
    // private _apiOverrides: { [key: string]: ChainAPIConfig } = {};
    // private _apis: { [key: string]: ChainAPIConfig } = {};

    constructor(environment?: GlitterEnvironment, mainnetConfig?:ChainRPCConfigs) {
        if (environment) this._sdk = this._sdk.setEnvironment(environment);

        // switch (environment) {
        //     case GlitterEnvironment.mainnet:
        //         if (!mainnetConfig) throw new Error("Mainnet Config not found");
        //         this._serverConfig = mainnetConfig;
        //         break;
        //     case GlitterEnvironment.testnet:
        //         this._serverConfig = ServerTestnet;
        //         break;
        //     default:
        //         throw new Error("Environment not found");
        // }
    }
    
    // public setChainAPIs(network: BridgeNetworks, api: ChainAPIConfig): GlitterSDKServer {
    //     this._apiOverrides[network] = api;
    //     return this;
    // }

    //Create Pollers
    public createPollers(networks: BridgeNetworks[]): GlitterSDKServer {
    
        //Check for RPC overrides
        //this.check_API_Overrides();

        //Connect Core SDK to networks
        this.sdk.connect(networks);

        //Create Pollers for each network
        networks.forEach((network) => {

            //Set API Config list
            // const apiConfig = this._serverConfig.chainAPIs.find((api) => api.network === network);
            // if (apiConfig) {
            //     const overrideConfig = this._apiOverrides[network];
            //     if (overrideConfig) {
            //         if (overrideConfig.API_KEY) apiConfig.API_KEY = overrideConfig.API_KEY;
            //         if (overrideConfig.API_URL) apiConfig.API_URL = overrideConfig.API_URL;
            //         if (overrideConfig.RPC) apiConfig.RPC = overrideConfig.RPC;
            //     }
            //     this._apis[network] = apiConfig;
            // }

            //Create poller:
            const poller = this.createPoller(network);
            poller.initialize(this);
            this._pollers.set(network, poller);
        });

        return this;
    }
    private createPoller(network: BridgeNetworks): GlitterPoller {
        switch (network) {
            case BridgeNetworks.algorand:
                return new GlitterAlgorandPoller();
            case BridgeNetworks.solana:
                return new GlitterSolanaPoller();
            case BridgeNetworks.Ethereum:
            case BridgeNetworks.Avalanche:
            case BridgeNetworks.Polygon:
            case BridgeNetworks.Arbitrum:
            case BridgeNetworks.Binance:
            case BridgeNetworks.Zkevm:  
            case BridgeNetworks.Optimism:
                return new GlitterEVMPoller(this, network);
            default:
                throw new Error("Network not supported");
        }
    }

    //Check overrides
    // private check_API_Overrides(): void {

    //     for (const key in this._apiOverrides) {
    //         const api = this._apiOverrides[key];
    //         console.log("Overriding " + api.network + " RPC to: " + api.RPC);
    //         this.sdk.setRPC(api.network, api.RPC);         
    //     }        
    // }

    public get sdk(): GlitterBridgeSDK {
        return this._sdk;
    }
    public get defaultLimit(): number {
        return this._defaultLimit;
    }
    public poller(networks: BridgeNetworks): GlitterPoller | undefined {
        return this._pollers.get(networks);
    }
    public API_Config(network: BridgeNetworks): ChainRPCConfig | undefined {
        
        const rpcList = this.sdk.rpcList;
        if (!rpcList) return undefined;

        //get API Config by looking for network
        const apiConfig = rpcList.chainAPIs.find((api) => api.network.toLocaleLowerCase() === network.toLocaleLowerCase());

        return apiConfig;
    }
}
