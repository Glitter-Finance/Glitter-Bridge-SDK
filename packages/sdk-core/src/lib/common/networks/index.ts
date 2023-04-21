export enum BridgeNetworks {
    algorand = "Algorand",
    solana = "Solana",
    Ethereum = "ethereum",
    Polygon = "polygon",
    Avalanche = "avalanche",
    TRON = "tron",
    Arbitrum = "arbitrum",
    BNB = "bnb",
    Zkevm = "zkevm",
}

export type BridgeEvmNetworks =
    | typeof BridgeNetworks.Avalanche
    | typeof BridgeNetworks.Ethereum
    | typeof BridgeNetworks.Polygon
    | typeof BridgeNetworks.Arbitrum
    | typeof BridgeNetworks.BNB
    | typeof BridgeNetworks.Zkevm;

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
    8: BridgeNetworks.BNB,
    9: BridgeNetworks.Zkevm
};

export const getNumericNetworkId = (chain: BridgeNetworks): number => {
    const n = Object.entries(NetworkIdentifiers).find(([, network]) => {
        return network === chain;
    });

    if (!n) throw new Error("Unsupported network");
    return Number(n[0]);
};

export const getNetworkByNumericId = (chain: number): BridgeNetworks => {
    const n = Object.entries(NetworkIdentifiers).find(([_id]) => {
        return Number(_id) === chain;
    });

    if (!n) throw new Error("Unsupported network");
    return n[1];
};
