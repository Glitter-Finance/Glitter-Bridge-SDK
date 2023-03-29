import {BridgeNetworks} from "src/lib/common/networks/networks";

export type AlgorandStandardAssetConfig = {
  destinationSymbol: Record<BridgeNetworks, string>;
  name: string;
  symbol: string;
  assetId: number;
  decimals: number;
  feeDivisor: number;
  minTransfer?: number;
  maxTransfer?: number;
  totalSupply?: bigint;
};

export type AlgorandNativeAssetConfig = Omit<
  AlgorandStandardAssetConfig,
  "assetId"
>;
export type AlgorandAssetConfig =
  | AlgorandNativeAssetConfig
  | AlgorandStandardAssetConfig;

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
  assets: Array<AlgorandStandardAssetConfig | AlgorandAssetConfig>;
};

export type AlgorandPollerOptions = {
  limit?: number;
  minRound?: number;
};
