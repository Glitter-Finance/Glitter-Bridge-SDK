import {
    BridgeNetworks,
    ChainRPCConfig,
    ChainRPCConfigs,
    GlitterBridgeSDK,
    GlitterEnvironment,
} from "@glitter-finance/sdk-core";
import { GlitterPoller } from "./lib/common/poller.Interface";
import { GlitterAlgorandPoller } from "./lib/chains/algorand/poller.algorand";
import { GlitterSolanaPoller } from "./lib/chains/solana/poller.solana";
import { GlitterEVMPoller } from "./lib/chains/evm/poller.evm";
import { GlitterTronPoller } from "./lib/chains/tron/poller.tron";

//Configs
//import { ChainAPIConfig, GlitterServerConfig } from "../configs/config";
//import { ServerTestnet } from "../configs/networks/testnet";

export class GlitterSDKServer {

    //Local Params
    private _sdk: GlitterBridgeSDK = new GlitterBridgeSDK();
    private _pollers: Map<BridgeNetworks, GlitterPoller> = new Map< BridgeNetworks, GlitterPoller >();
    private _defaultLimit = 25;
    private _customRPCConfig?: ChainRPCConfigs;

    constructor(environment?: GlitterEnvironment, customRPCConfig?:ChainRPCConfigs) {
        if (environment) this._sdk = this._sdk.setEnvironment(environment);

        this._customRPCConfig = customRPCConfig;       
    }

    //Create Pollers
    public createPollers(networks: BridgeNetworks[]): GlitterSDKServer {
    
        //Connect Core SDK to networks
        this.sdk.connect(networks, this._customRPCConfig);

        //Create Pollers for each network
        networks.forEach((network) => {           

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
            case BridgeNetworks.TRON:
                return new GlitterTronPoller();
            default:
                throw new Error("Network not supported");
        }
    }  

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
