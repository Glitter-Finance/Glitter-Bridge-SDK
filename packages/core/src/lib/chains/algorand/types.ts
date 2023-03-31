import {
    AlgorandNativeTokenConfig,
    AlgorandStandardAssetConfig,
} from "src/lib/common";

export type AlgorandConfig = {
  serverUrl: string;
  serverPort: number;
  indexerUrl: string;
  indexerPort: string | number;
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
    tokenBridgeV2Address: string;
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
