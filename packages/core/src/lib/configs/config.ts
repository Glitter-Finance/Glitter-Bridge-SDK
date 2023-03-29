import {AlgorandConfig} from "../chains/algorand";
import {EvmConfig} from "../chains/evm";
import {FlowConfig} from "../chains/flow/config";
import {HederaConfig} from "../chains/hedera/config";
import {SolanaConfig} from "../chains/solana";
import {StellarConfig} from "../chains/stellar/config";
import {TronConfig} from "../chains/tron/types";

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
