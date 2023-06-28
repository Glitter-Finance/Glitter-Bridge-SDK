import {
    BridgeNetworks,
    BridgeType,
    ChainRPCConfig,
    ChainRPCConfigs,
    GlitterBridgeSDK,
    GlitterEnvironment,
    PartialBridgeTxn,
    PartialBridgeTxnEquals,
    PartialTxn,
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

    constructor(environment?: GlitterEnvironment, customRPCConfig?:ChainRPCConfigs, defaultLimit?:number) {
        if (environment) this._sdk = this._sdk.setEnvironment(environment);
        this._defaultLimit= defaultLimit || this._defaultLimit;

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

    public async parseTxnID(network: BridgeNetworks, txnID: string, type:BridgeType): Promise<PartialBridgeTxn | undefined> {
        const poller = this.poller(network);
        if (!poller) throw new Error("Poller not found");
        return await poller.parseTxnID(this, txnID, type);
    }

    public async verifyTransaction(txn:PartialBridgeTxn): Promise<boolean> {

        //Fail safe
        if (!txn.network) throw new Error("Network not found");
        if (!txn.bridgeType) throw new Error("Type not found");
        if (!txn.txnID) throw new Error("TxnID not found");

        const poller = this.poller(txn.network as BridgeNetworks);
        if (!poller) throw new Error("Poller not found");
        const checkedTxn =await poller.parseTxnID(this, txn.txnID, txn.bridgeType);
        if (!checkedTxn) throw new Error("Txn not found");

        //Check if the values of the txn match
        return PartialBridgeTxnEquals(txn, checkedTxn);

    }
}
