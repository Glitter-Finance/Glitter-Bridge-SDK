import { MultisigMetadata } from "algosdk";
import {
    AlgorandNativeTokenConfig,
    AlgorandStandardAssetConfig,
} from "../../../lib/common";

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
