import { BridgeNetworks } from "./lib";
import { AlgorandConfig } from "./lib/chains/algorand";
import { EvmConfig } from "./lib/chains/evm";
import { SolanaConfig } from "./lib/chains/solana";
import { TronConfig } from "./lib/chains/tron";

export type GlitterBridgeConfig = {
  name: GlitterEnvironment;
  algorand: AlgorandConfig;
  solana: SolanaConfig;
  evm: EvmConfig;
  tron: TronConfig;
  confirmations: { [key in BridgeNetworks]: number };  
  gasTokens: { [key in BridgeNetworks]: string };
};

export enum GlitterEnvironment {
  mainnet = "mainnet",
  testnet = "testnet",
}

export type ChainRPCConfigs = {
    chainAPIs: ChainRPCConfig[];
    CMC_API: string;
}
export type ChainRPCConfig = {
    network: BridgeNetworks;
    API_KEY: string;
    API_URL: string;
    RPC: string;
}