import {AlgorandConfig} from "./lib/chains/algorand";
import {EvmConfig} from "./lib/chains/evm";
import {FlowConfig} from "./lib/chains/flow/config";
import {HederaConfig} from "./lib/chains/hedera/config";
import {SolanaConfig} from "./lib/chains/solana";
import {StellarConfig} from "./lib/chains/stellar/config";
import {TronConfig} from "./lib/chains/tron";

export type GlitterBridgeConfig = {
  name: string;
  algorand: AlgorandConfig;
  solana: SolanaConfig;
  evm: EvmConfig;
  stellar: StellarConfig;
  hedera: HederaConfig;
  tron: TronConfig;
  flow: FlowConfig;
};

export enum GlitterEnvironment {
  mainnet = "mainnet",
  testnet = "testnet",
}
