interface BaseTokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  feeDivisor?: number;
  minTransfer?: number;
  maxTransfer?: number;
  totalSupply?: bigint;
}

export type BridgeTokenConfig = { 
  address: string;
  type: "__bridgeTokenConfig"
} & BaseTokenConfig;

export type AlgorandStandardAssetConfig = {
  assetId: number;
  wrappedSymbol?: string
  type: "__algorandStandardAssetConfig"
} & BaseTokenConfig;

export type AlgorandNativeTokenConfig = {
  isNative: boolean;
  wrappedSymbol?: string;
  type: "__algorandNativeTokenConfig"
} & BaseTokenConfig;