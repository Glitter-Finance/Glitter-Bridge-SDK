/**
 * Enum representing different bridge networks.
 *
 * @enum {string}
 * @readonly
 */
export enum BridgeNetworks {
    algorand = "Algorand",
    solana = "Solana",
    Ethereum = "ethereum",
    Polygon = "polygon",
    Avalanche = "avalanche",
    TRON = "tron",
    Arbitrum = "arbitrum",
    Binance = "binance",
    Zkevm = "zkevm",
    Optimism = "optimism"
}

/**
 * Type representing EVM-based bridge networks.
 *
 * @typedef {typeof BridgeNetworks.Avalanche | typeof BridgeNetworks.Ethereum | typeof BridgeNetworks.Polygon | typeof BridgeNetworks.Arbitrum | typeof BridgeNetworks.Binance | typeof BridgeNetworks.Zkevm | typeof BridgeNetworks.Optimism} BridgeEvmNetworks
 */
export type BridgeEvmNetworks =
    | typeof BridgeNetworks.Avalanche
    | typeof BridgeNetworks.Ethereum
    | typeof BridgeNetworks.Polygon
    | typeof BridgeNetworks.Arbitrum
    | typeof BridgeNetworks.Binance
    | typeof BridgeNetworks.Zkevm
    | typeof BridgeNetworks.Optimism;

/**
 * These IDs will be stored
 * within event logs to
 * recreate routing information
 * on chain
 */
export const NetworkIdentifiers: {
    [chainId: number]: BridgeNetworks;
} = {
    1: BridgeNetworks.algorand,
    2: BridgeNetworks.Avalanche,
    3: BridgeNetworks.Ethereum,
    4: BridgeNetworks.solana,
    5: BridgeNetworks.Polygon,
    6: BridgeNetworks.TRON,
    7: BridgeNetworks.Arbitrum,
    8: BridgeNetworks.Binance,
    9: BridgeNetworks.Zkevm,
    10: BridgeNetworks.Optimism,
};

/**
 * Retrieves the numeric network ID for the specified bridge network.
 *
 * @function getNumericNetworkId
 * @param {BridgeNetworks} chain - The bridge network.
 * @returns {number} - The numeric network ID.
 */
export const getNumericNetworkId = (chain: BridgeNetworks): number => {
    const n = Object.entries(NetworkIdentifiers).find(([, network]) => {
        return network === chain;
    });

    if (!n) throw new Error("Unsupported network");
    return Number(n[0]);
};

/**
 * Retrieves the bridge network based on the specified numeric network ID.
 *
 * @function getNetworkByNumericId
 * @param {number} chain - The numeric network ID.
 * @returns {BridgeNetworks} - The bridge network represented by the `BridgeNetworks` enum.
 */
export const getNetworkByNumericId = (chain: number): BridgeNetworks => {
    const n = Object.entries(NetworkIdentifiers).find(([_id]) => {
        return Number(_id) === chain;
    });

    if (!n) throw new Error("Unsupported network");
    return n[1];
};
