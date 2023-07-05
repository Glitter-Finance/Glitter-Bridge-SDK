import { MultisigMetadata } from "algosdk";
import {
    AlgorandNativeTokenConfig,
    AlgorandStandardAssetConfig,
} from "../../../lib/common";

/**
 * Configuration object for Algorand.
 * @typedef {Object} AlgorandConfig
 * @property {string} serverUrl - The URL of the Algorand server.
 * @property {string} [serverPort] - The port of the Algorand server (optional).
 * @property {string} indexerUrl - The URL of the Algorand indexer.
 * @property {string} [indexerPort] - The port of the Algorand indexer (optional).
 * @property {string} nativeTokenSymbol - The symbol of the native token.
 * @property {number} bridgeProgramId - The program ID for the bridge.
 * @property {Object} bridgeAccounts - The accounts used by the bridge.
 * @property {string} bridgeAccounts.asaOwner - The ASA owner account.
 * @property {string} bridgeAccounts.algoOwner - The Algo owner account.
 * @property {string} bridgeAccounts.bridgeOwner - The bridge owner account.
 * @property {string} bridgeAccounts.feeReceiver - The fee receiver account.
 * @property {string} bridgeAccounts.multiSig1 - The first multisig account.
 * @property {string} bridgeAccounts.multiSig2 - The second multisig account.
 * @property {string} bridgeAccounts.bridge - The bridge account.
 * @property {string} bridgeAccounts.asaVault - The ASA vault account.
 * @property {string} bridgeAccounts.algoVault - The Algo vault account.
 * @property {string} bridgeAccounts.usdcReceiver - The USDC receiver account.
 * @property {string} bridgeAccounts.usdcDeposit - The USDC deposit account.
 * @property {string} bridgeAccounts.tokenBridgeProgramID - The program ID for the token bridge.
 * @property {string} bridgeAccounts.tokenBridgeV2ProgramID - The program ID for the token bridge V2.
 * @property {Array<AlgorandNativeTokenConfig | AlgorandStandardAssetConfig>} assets - The array of asset configurations.
 */
export type AlgorandConfig = {
  serverUrl: string;
  serverPort?: string;
  indexerUrl: string;
  indexerPort?: string;
  nativeTokenSymbol: string;
  bridgeProgramId: number;
  bridgeAccounts: {
    asaOwner: string;
    algoOwner: string;
    bridgeOwner: string;
    feeReceiver: string;
    multiSig1: string;
    multiSig2: string;
    bridge: string;
    asaVault: string;
    algoVault: string;
    usdcReceiver: string;
    usdcDeposit: string;    
    tokenBridgeProgramID: string;
    tokenBridgeV2ProgramID: string;
  };
  assets: Array<AlgorandNativeTokenConfig | AlgorandStandardAssetConfig>;
};

/**
 * Options for the Algorand poller.
 * @typedef {Object} AlgorandPollerOptions
 * @property {number} [limit] - The maximum number of items to retrieve per poll.
 * @property {number} [minRound] - The minimum round number to retrieve items from.
 */
export type AlgorandPollerOptions = {
  limit?: number;
  minRound?: number;
};

export type AlgorandAccountInformation = {
  address: string;
  amount: number;
  "amount-without-pending-rewards": number;
  "apps-local-state": Array<any>;
  "apps-total-schema": { "num-byte-slice": number; "num-uint": number };
  "created-apps": Array<any>;
  "created-assets": Array<any>;
  "min-balance": number;
  "pending-rewards": number;
  "reward-base": number;
  rewards: number;
  round: number;
  status: string;
  "total-apps-opted-in": number;
  "total-assets-opted-in": number;
  "total-created-apps": number;
  "total-created-assets": number;
  assets: Array<{
    amount: number;
    "asset-id": number;
    "is-frozen": boolean;
  }>;
};

export type AlgorandAssetMetadata = {
  index: number;
  params: {
    creator: string;
    decimals: number;
    "default-frozen": boolean;
    freeze: string;
    manager: string;
    name: string;
    "name-b64": string;
    reserve: string;
    total: number;
    "unit-name": string;
    "unit-name-b64": string;
    url: string;
    "url-b64": string;
  };
};

export type AlgorandAccount = {
  addr: string;
  sk: Uint8Array;
  pk: Uint8Array;
  information?: AlgorandAccountInformation;
};

export type AlgorandMultiSigAccount = {
  addr: string;
  pk: Uint8Array;
  addresses: string[];
  params: MultisigMetadata;
  information: AlgorandAccountInformation;
};
