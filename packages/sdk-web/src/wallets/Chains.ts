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
}

enum NonEVMChains {
  SOLANA = 101,
  SOLANA_TESTNET = 111,
  ALGO = 4000,
  ALGO_TESTNET = 4001,
  TRON = 1234
}

export enum ChainNames {
  ALGORAND = "Algorand",
  SOLANA = "Solana",
  ETHEREUM = "ethereum",
  POLYGON = "polygon",
  AVALANCHE = "avalanche",
  TRON = "tron",
}

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