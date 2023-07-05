import { BridgeTokenConfig } from "../../common";

/**
 * Represents the configuration for a Solana network.
 *
 * @typedef {Object} SolanaConfig
 * @property {string} name - The name of the Solana network.
 * @property {string} server - The server URL of the Solana network.
 * @property {SolanaAccountsConfig} accounts - The configuration for Solana accounts.
 * @property {BridgeTokenConfig[]} tokens - An array of configuration objects for Bridge tokens.
 */
export type SolanaConfig = {
  name: string;
  server: string;
  accounts: SolanaAccountsConfig;
  tokens: BridgeTokenConfig[];
};

/**
 * Represents the configuration for Solana accounts.
 *
 * @typedef {Object} SolanaAccountsConfig
 * @property {string} bridgeProgram - The address of the bridge program account.
 * @property {string} vestingProgram - The address of the vesting program account.
 * @property {string} owner - The address of the owner account.
 * @property {string} usdcReceiver - The address of the USDC receiver account.
 * @property {string} usdcReceiverTokenAccount - The address of the USDC receiver token account.
 * @property {string} usdcDeposit - The address of the USDC deposit account.
 * @property {string} usdcDepositTokenAccount - The address of the USDC deposit token account.
 * @property {string} memoProgram - The address of the memo program account.
 * @property {string} solVault - The address of the SOL vault account.
 * @property {string} tokenBridgeV2Address - The address of the Token Bridge V2 account.
 */
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

/**
 * Represents the options for a poller.
 *
 * @typedef {Object} PollerOptions
 * @property {number} [limit] - The maximum number of items to poll (optional).
 * @property {string} [startHash] - The starting hash for polling (optional).
 * @property {string} [endHash] - The ending hash for polling (optional).
 */
export type PollerOptions = {
  limit?: number;
  startHash?: string;
  endHash?: string;
};

/**
 * Enum representing the URLs of public Solana networks.
 *
 * @enum {string}
 * @property {string} mainnet_beta - The URL of the Mainnet Beta network.
 * @property {string} testnet - The URL of the Testnet network.
 * @property {string} devnet - The URL of the Devnet network.
 */
export enum SolanaPublicNetworks {
  mainnet_beta = "https://api.mainnet-beta.solana.com",
  testnet = "https://api.testnet.solana.com",
  devnet = "https://api.devnet.solana.com",
}
