import {BridgeTokenConfig} from "../../common";

export type SolanaConfig = {
  name: string;
  server: string;
  accounts: SolanaAccountsConfig;
  tokens: BridgeTokenConfig[];
};

export type SolanaAccountsConfig = {
  bridgeProgram: string;
  vestingProgram: string;
  owner: string;
  usdcReceiver: string;
  usdcReceiverTokenAccount: string;
  usdcDeposit: string;
  usdcDepositTokenAccount: string;
  memoProgram: string;
  solVault: string;
  tokenBridgeV2Address: string;
};

export enum SolanaProgramId {
  BridgeProgramId = "bridgeProgram",
  VestingProgramId = "vestingProgram",
  OwnerId = "owner",
  UsdcReceiverId = "usdcReceiver",
  UsdcDepositId = "usdcDeposit",
  MemoProgramId = "memoProgram",
  UsdcMint = "UsdcMint",
}

export type PollerOptions = {
  limit?: number;
  startHash?: string;
  endHash?: string;
};

export enum SolanaPublicNetworks {
  mainnet_beta = "https://api.mainnet-beta.solana.com",
  testnet = "https://api.testnet.solana.com",
  devnet = "https://api.devnet.solana.com",
}
