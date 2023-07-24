import { GlitterBridgeSDK } from "../../../GlitterBridgeSDK";
import { BridgeNetworks } from "../networks";
import { AlgoBlockData, EVMBlockData, SolanaBlockData, TronBlockData } from "./blockByChain";

/**
 * Represents the current block data for a chain.
 *
 * @typedef {Object} CurrentBlockData
 * @property {number} block - The current block.
 * @property {number} timestamp - The timestamp when the block data was retrieved.
 * @property {BlockDataStatus} status - The status of the block data (fresh, updated, cached).
 */
export type CurrentBlockData = {
    block: number;
    timestamp: number;
    status: BlockDataStatus;
}

/**
 * Enum representing the status of block data.
 *
 * @enum {string}
 * @readonly
 */
export enum BlockDataStatus {
    Fresh = "Fresh",
    Updated = "Updated",
    Cached = "Cached",
    Error = "Error"
}

/**
 * Represents a class for getting and caching the current block of bridge networks.
 *
 * @class CurrentBlock
 */
export class CurrentBlock{

    /**
     * Updates the price for the specified token.
     *
     * @static
     * @async
     * @function updateBlock
     * @param {GlitterBridgeSDK} sdk - The SDK instance to use.
     * @param {BridgeNetworks} network - The chain to update.
     * @returns {Promise<CurrentBlockData>} - A Promise that resolves to the updated current block data for the chain.
     */
    public static async updateBlock(sdk: GlitterBridgeSDK, network: BridgeNetworks): Promise<CurrentBlockData> {

        let blockData: {
                block: number;
                isFresh: boolean;
            } | undefined = undefined;

        switch (network.toLocaleLowerCase()) {
            case BridgeNetworks.Ethereum.toLocaleLowerCase():
            case BridgeNetworks.Binance.toLocaleLowerCase():
            case BridgeNetworks.Polygon.toLocaleLowerCase():
            case BridgeNetworks.Avalanche.toLocaleLowerCase():
            case BridgeNetworks.Zkevm.toLocaleLowerCase():
            case BridgeNetworks.Arbitrum.toLocaleLowerCase():
            case BridgeNetworks.Optimism.toLocaleLowerCase():
                blockData = await EVMBlockData(sdk, network);
                break;

            case BridgeNetworks.algorand.toLocaleLowerCase():
                blockData = await AlgoBlockData(sdk);
                break;

            case BridgeNetworks.solana.toLocaleLowerCase():
                blockData = await SolanaBlockData(sdk);
                break;
            
            case BridgeNetworks.TRON.toLocaleLowerCase():
                blockData = await TronBlockData(sdk);
                break;

            default:
                return {
                    block: 0,
                    timestamp: 0,
                    status: BlockDataStatus.Error
                }
        }

        //Return result
        if (blockData) {
            return {
                block: blockData.block,
                timestamp: Date.now(),
                status: blockData.isFresh ? BlockDataStatus.Fresh : BlockDataStatus.Cached
            }
        } else {
            return {
                block: 0,
                timestamp: 0,
                status: BlockDataStatus.Error
            }
        }

    }

    /**
     * Retrieves the block data for the specified token.
     *
     * @static
     * @async
     * @function getCurrentBlock
     * @param {GlitterBridgeSDK} sdk - The SDK instance to use.
     * @param {BridgeNetworks} network -  The chain to get the block data for.
     * @returns {Promise<CurrentBlockData>} - A Promise that resolves to the current block data for the chain.
     */
    public static async getCurrentBlock(sdk: GlitterBridgeSDK, networkName: string): Promise<CurrentBlockData>
    public static async getCurrentBlock(sdk: GlitterBridgeSDK, network: BridgeNetworks): Promise<CurrentBlockData>
    public static async getCurrentBlock(sdk: GlitterBridgeSDK, networkOrName?: string | BridgeNetworks): Promise<CurrentBlockData> {

        //get BridgeNetwork from networkorName
        let network :BridgeNetworks| undefined = undefined;

        //iterate through BridgeNetworks enum 
        for (const key in BridgeNetworks) {
            if (key.toLocaleLowerCase() === networkOrName?.toLocaleLowerCase()) {
                network = BridgeNetworks[key as keyof typeof BridgeNetworks];
                break;
            }
        }
        if (!network) {
            throw new Error(`Invalid network: ${networkOrName}`);
        }

        //Get and return price
        return await this.updateBlock(sdk, network);
    }
}