import { BridgeNetworks } from "./lib";
import { AlgorandConfig } from "./lib/chains/algorand";
import { EvmConfig } from "./lib/chains/evm";
import { SolanaConfig } from "./lib/chains/solana";
import { TronConfig } from "./lib/chains/tron";

/**
 * Configuration object for the Glitter Bridge.
 */
export type GlitterBridgeConfig = {
  name: GlitterEnvironment;
  algorand: AlgorandConfig;
  solana: SolanaConfig;
  evm: EvmConfig;
  tron: TronConfig;
  confirmations: { [key in BridgeNetworks]: number };  
  gasTokens: { [key in BridgeNetworks]: string };
};

/**
 * Enumeration of Glitter Bridge environments.
 */
export enum GlitterEnvironment {
  mainnet = "mainnet",
  testnet = "testnet",
}

/**
 * Configuration for chain RPC endpoints and CoinMarketCap API.
 */
export type ChainRPCConfigs = {
    chainAPIs: ChainRPCConfig[];
    CMC_API: string;
}

/**
 * Configuration for a specific chain's RPC endpoint.
 */
export type ChainRPCConfig = {
    network: BridgeNetworks;
    API_KEY: string;
    API_URL: string;
    RPC: string;
}