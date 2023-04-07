interface BaseTokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  feeDivisor?: number;
  minTransfer?: number;
  maxTransfer?: number;
  totalSupply?: bigint;
  wrappedSymbol?: string
}

export type BridgeTokenConfig = { 
  address: string;
} & BaseTokenConfig;

export type AlgorandStandardAssetConfig = {
  assetId: number;
} & BaseTokenConfig;

export type AlgorandNativeTokenConfig = {
  isNative: boolean;
} & BaseTokenConfig;