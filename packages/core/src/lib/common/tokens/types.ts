interface BaseTokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  feeDivisor?: number;
  minTransfer?: number;
  maxTransfer?: number;
  totalSupply?: bigint;
}

export type BridgeTokenConfig = { address: string } & BaseTokenConfig;
export type AlgorandStandardAssetConfig = Omit<BridgeTokenConfig, "address"> & {
  assetId: number;
} & { destinationSymbol: Record<string, string> };
export type AlgorandNativeTokenConfig = Omit<BridgeTokenConfig, "address"> & {
  isNative: boolean;
  destinationSymbol: Record<string, string>;
};
