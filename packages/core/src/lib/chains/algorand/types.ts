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
