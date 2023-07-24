import { BridgeNetworks } from '@glitter-finance/sdk-core';

enum EVMChains {
  ETHEREUM = 1,
  ETHEREUM_ROPSTEN = 3,
  ETHEREUM_RINKEBY = 4,
  ETHEREUM_GOERLI = 5,
  ETHEREUM_KOVAN = 6,
  FANTOM = 250,
  FANTOM_TESTNET = 4002,
  BSC = 56,
  BSC_TESTNET = 97,
  AVALANCHE = 43114,
  POLYGON = 137,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  ZKEVM = 1101,
}

enum NonEVMChains {
  SOLANA = 101,
  SOLANA_TESTNET = 111,
  ALGO = 4000,
  ALGO_TESTNET = 4001,
  TRON = 1234
}

export  const ChainNames = {
  ALGORAND : BridgeNetworks.algorand,
  SOLANA : BridgeNetworks.solana,
  ETHEREUM : BridgeNetworks.Ethereum,
  POLYGON : BridgeNetworks.Polygon,
  AVALANCHE : BridgeNetworks.Avalanche,
  TRON : BridgeNetworks.TRON,
  ARBITRUM : BridgeNetworks.Arbitrum,
  OPTIMISM : BridgeNetworks.Optimism,
  ZKEVM : BridgeNetworks.Zkevm,
  BSC : BridgeNetworks.Binance,
} as const;


export const EvmNetworks = [
    BridgeNetworks.Avalanche, 
    BridgeNetworks.Ethereum,
    BridgeNetworks.Polygon, 
    BridgeNetworks.Arbitrum,
    BridgeNetworks.Binance,
    BridgeNetworks.Optimism,
    BridgeNetworks.Zkevm
];
export const ChainNativeCurrency = {
    [EVMChains.AVALANCHE.toString()]: {
        name: "AVAX",
        symbol: "AVAX",
        decimals: 18,
    },
    [EVMChains.POLYGON.toString()]: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
    }
}

export const Chains = {...NonEVMChains, ...EVMChains};
