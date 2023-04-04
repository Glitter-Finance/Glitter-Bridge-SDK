import {AlgorandConfig} from "./lib/chains/algorand";
import {EvmConfig} from "./lib/chains/evm";
import {SolanaConfig} from "./lib/chains/solana";
import {TronConfig} from "./lib/chains/tron";

export type GlitterBridgeConfig = {
  name: GlitterEnvironment;
  algorand: AlgorandConfig;
  solana: SolanaConfig;
  evm: EvmConfig;
  tron: TronConfig;
};

export enum GlitterEnvironment {
  mainnet = "mainnet",
  testnet = "testnet",
}
