import { BridgeNetworks, BridgeType, GlitterBridgeSDK, GlitterEnvironment } from "glitter-sdk-core";
import { GlitterPoller } from "./common/poller.Interface";
import { Cursor } from "./common/cursor";
import { GlitterAlgorandPoller } from "./chains/algorand/poller.algorand";
import { GlitterSolanaPoller } from "./chains/solana/poller.solana";
import { GlitterEVMPoller } from "./chains/evm/poller.evm";
import { clusterApiUrl } from "@solana/web3.js";

export class GlitterSDKServer {
    private _sdk: GlitterBridgeSDK = new GlitterBridgeSDK();
    private _pollers: Map<BridgeNetworks, GlitterPoller> = new Map<BridgeNetworks, GlitterPoller>();
    private _defaultLimit = 5;

    constructor(environment?: GlitterEnvironment) {
        if (environment) this._sdk = this._sdk.setEnvironment(environment);
    }

    //Create Pollers
    public createPollers(networks: BridgeNetworks[]): GlitterSDKServer {
        //Check for RPC overrides
        this.check_RPC_Overrides();

        //Connect Core SDK to networks
        this.sdk.connect(networks);

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
                return new GlitterEVMPoller(this, network);

            default:
                throw new Error("Network not supported");
        }
    }

    //Check overrides
    private check_RPC_Overrides(): void {
        const { ETH_RPC, POLYGON_RPC, AVAX_RPC, SOLANA_RPC } = process.env;

        if (ETH_RPC) {
            console.log("Overriding Ethereum RPC to: " + ETH_RPC);
            this.sdk.setRPC(BridgeNetworks.Ethereum, ETH_RPC);
        }

        if (POLYGON_RPC) {
            console.log("Overriding Polygon RPC to: " + POLYGON_RPC);
            this.sdk.setRPC(BridgeNetworks.Polygon, POLYGON_RPC);
        }

        if (AVAX_RPC) {
            console.log("Overriding Avalanche RPC to: " + AVAX_RPC);
            this.sdk.setRPC(BridgeNetworks.Avalanche, AVAX_RPC);
        }

        if (this.sdk.environment === GlitterEnvironment.mainnet) {
            if (SOLANA_RPC) {
                this.sdk.setRPC(BridgeNetworks.solana, SOLANA_RPC);
            }
        } else {
            this.sdk.setRPC(BridgeNetworks.solana, clusterApiUrl("testnet"));
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
}
