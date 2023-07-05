import {
    BridgeNetworks,
    BridgeType,
    ChainRPCConfig,
    ChainRPCConfigs,
    GlitterBridgeSDK,
    GlitterEnvironment,
    PartialBridgeTxn,
    PartialBridgeTxnEquals
} from "@glitter-finance/sdk-core";
import { GlitterPoller } from "./lib/common/poller.Interface";
import { GlitterAlgorandPoller } from "./lib/chains/algorand/poller.algorand";
import { GlitterSolanaPoller } from "./lib/chains/solana/poller.solana";
import { GlitterEVMPoller } from "./lib/chains/evm/poller.evm";
import { GlitterTronPoller } from "./lib/chains/tron/poller.tron";

//Configs
//import { ChainAPIConfig, GlitterServerConfig } from "../configs/config";
//import { ServerTestnet } from "../configs/networks/testnet";

/**
 * Glitter SDK Server class.
 */
export class GlitterSDKServer {

    //Local Params
    private _sdk: GlitterBridgeSDK = new GlitterBridgeSDK();
    private _pollers: Map<BridgeNetworks, GlitterPoller> = new Map< BridgeNetworks, GlitterPoller >();
    private _defaultLimit = 25;
    private _customRPCConfig?: ChainRPCConfigs;

    /**
     * Creates a new instance of the GlitterSDKServer class.
     * @constructor
     * @param {GlitterEnvironment} [environment] - The Glitter environment.
     * @param {ChainRPCConfigs} [customRPCConfig] - Custom RPC configurations.
     * @param {number} [defaultLimit] - Default limit value.
     */
    constructor(environment?: GlitterEnvironment, customRPCConfig?:ChainRPCConfigs, defaultLimit?:number) {
        if (environment) this._sdk = this._sdk.setEnvironment(environment);
        this._defaultLimit= defaultLimit || this._defaultLimit;

        this._customRPCConfig = customRPCConfig;       
    }

    //Create Pollers
    /**
     * Creates pollers for the specified networks.
     * @param {BridgeNetworks[]} networks - The array of bridge networks.
     * @return {GlitterSDKServer} The Glitter SDK server instance.
     */
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

    /**
     * Creates a poller for the specified network.
     * @private
     * @param {BridgeNetworks} network - The bridge network.
     * @returns {GlitterPoller} The Glitter poller instance.
     */
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

    /**
     * Getter for the GlitterBridgeSDK instance.
     * @public
     * @returns {GlitterBridgeSDK} The GlitterBridgeSDK instance.
     */
    public get sdk(): GlitterBridgeSDK {
        return this._sdk;
    }

    /**
     * Getter for the default limit value.
     * @public
     * @returns {number} The default limit value.
     */
    public get defaultLimit(): number {
        return this._defaultLimit;
    }
    /**
     * Retrieves the poller for the specified network.
     * @public
     * @param {BridgeNetworks} networks - The bridge network.
     * @returns {GlitterPoller|undefined} The GlitterPoller instance or undefined if not found.
     */
    public poller(networks: BridgeNetworks): GlitterPoller | undefined {
        return this._pollers.get(networks);
    }

    /**
     * Retrieves the API configuration for the specified network.
     * @public
     * @param {BridgeNetworks} network - The bridge network.
     * @returns {ChainRPCConfig|undefined} The API configuration or undefined if not found.
     */
    public API_Config(network: BridgeNetworks): ChainRPCConfig | undefined {
        
        const rpcList = this.sdk.rpcList;
        if (!rpcList) return undefined;

        //get API Config by looking for network
        const apiConfig = rpcList.chainAPIs.find((api) => api.network.toLocaleLowerCase() === network.toLocaleLowerCase());

        return apiConfig;
    }

    /**
     * Parses a transaction ID for the specified network and bridge type.
     * @public
     * @param {BridgeNetworks} network - The bridge network.
     * @param {string} txnID - The transaction ID to parse.
     * @param {BridgeType} type - The bridge type.
     * @returns {Promise<PartialBridgeTxn|undefined>} A promise that resolves to the parsed transaction or undefined if not found.
     */
    public async parseTxnID(network: BridgeNetworks, txnID: string, type:BridgeType): Promise<PartialBridgeTxn | undefined> {
        const poller = this.poller(network);
        if (!poller) throw new Error("Poller not found");
        return await poller.parseTxnID(this, txnID, type);
    }

    /**
     * Verifies a partial bridge transaction.
     * @public
     * @param {PartialBridgeTxn} txn - The partial bridge transaction to verify.
     * @returns {Promise<boolean>} A promise that resolves to true if the transaction is verified, false otherwise.
     */
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
