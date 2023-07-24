import { GlitterBridgeSDK } from "../../../GlitterBridgeSDK";
import { BridgeEvmNetworks, BridgeNetworks } from "../networks";

/**
 * Cache object for storing block data for different networks.
 *
 * @type {Object.<string, { block: number, updatedAt: number }>}
 * @constant
 */
const block_cache: {
    [network: string]: {
        block: number;
        updatedAt: number;
    };
} = {};

const cache_duration = 1000 * 10; // 10 seconds

/**
 * Retrieves the EVM block data for the specified network.
 *
 * @async
 * @function EVMBlockData
 * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
 * @param {BridgeNetworks} network - The network for which to retrieve the EVM block data.
 * @returns {Promise<{ block: number, isFresh: boolean }>} - A Promise that resolves to an object containing the native block as a number and a boolean indicating if the block data is fresh.
 */
export async function EVMBlockData(sdk: GlitterBridgeSDK, network: BridgeNetworks): Promise<{
    block: number;
    isFresh: boolean;
}> {      
   
    //Check if the cache is still valid
    const current = new Date().getTime();
    if (block_cache[network]) {
        if (block_cache[network].updatedAt + cache_duration >= current) {
            return {
                block: block_cache[network].block,
                isFresh: false
            }
        }
    }
   
    //Get New Block
    const connect = sdk.getEvmNetwork(network as BridgeEvmNetworks);
    if (!connect) throw new Error(`Failed to get EVM network ${network}`);

    const block = await connect.provider.getBlockNumber();
 
    //Update Cache
    block_cache[network] = {
        block: block,
        updatedAt: current,
    };

    return {
        block: block,
        isFresh: true
    };
}

/**
 * Retrieves the Algo block data.
 *
 * @async
 * @function AlgoBlockData
 * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
 * @returns {Promise<{ block: number, isFresh: boolean }>} - A Promise that resolves to an object containing the native block data as a number and a boolean indicating if the block data is fresh.
 */
export async function AlgoBlockData(sdk: GlitterBridgeSDK): Promise<{
    block: number;
    isFresh: boolean;
}> {     
    
    const network = BridgeNetworks.algorand;
    
    //Check if the cache is still valid
    const current = new Date().getTime();
    if (block_cache[network]) {
        if (block_cache[network].updatedAt + cache_duration >= current) {
            return {
                block: block_cache[network].block,
                isFresh: false
            }
        }
    }

    //Get new data
    const connect = sdk.algorand?.client;
    if (!connect) throw new Error(`Failed to get Algorand network`);

    const status = await connect.status().do();
    const block = status["last-round"];

    //Update Cache
    block_cache[network] = {
        block: block,
        updatedAt: current,
    };

    return {
        block: block,
        isFresh: true
    };
   
}

/**
 * Retrieves the Solana block data.
 *
 * @async
 * @function SolanaBlockData
 * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
 * @returns {Promise<{ block: number, isFresh: boolean }>} - A Promise that resolves to an object containing the native block data as a number and a boolean indicating if the block data is fresh.
 */
export async function SolanaBlockData(sdk: GlitterBridgeSDK):Promise<{
    block: number;
    isFresh: boolean;
}> {      
    const network = BridgeNetworks.solana;
        
    //Check if the cache is still valid
    const current = new Date().getTime();
    if (block_cache[network]) {
        if (block_cache[network].updatedAt + cache_duration >= current) {
            return {
                block: block_cache[network].block,
                isFresh: false
            }
        }
    }
    
    //Get New Data
    const connect = sdk.solana?.connections[sdk.solana?.defaultConnection];
    if (!connect) throw new Error(`Failed to get Solana network`);
    
    const block = await connect.getSlot();

    //Update Cache
    block_cache[network] = {
        block: block,
        updatedAt: current,
    };

    return {
        block: block,
        isFresh: true
    };
    
}

/**
 * Retrieves the Tron block data.
 *
 * @async
 * @function TronBlockData
 * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
 * @returns {Promise<{ block: number, isFresh: boolean }>} - A Promise that resolves to an object containing the native block data as a number and a boolean indicating if the block data is fresh.
 */
export async function TronBlockData(sdk: GlitterBridgeSDK):Promise<{
    block: number;
    isFresh: boolean;
}> {  

    const network = BridgeNetworks.TRON;
    
    //Check if the cache is still valid
    const current = new Date().getTime();
    if (block_cache[network]) {
        if (block_cache[network].updatedAt + cache_duration >= current) {
            return {
                block: block_cache[network].block,
                isFresh: false
            }
        }
    }

    //Get Fresh Data
    const tronConnect = sdk.tron
    if (!tronConnect) throw new Error(`Failed to get Tron network`);
    const tronWeb = tronConnect.tronWeb;
    
    const blockObj = await tronWeb.trx.getCurrentBlock();
    const block = blockObj.block_header.raw_data.number;

    //Update Cache
    block_cache[network] = {
        block: block,
        updatedAt: current,
    };

    return {
        block: block,
        isFresh: true
    };
    
}
