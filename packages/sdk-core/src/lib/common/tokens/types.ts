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

export type Token2ConfigList = {
  "tokens": Token2Config[];
}
export type Token2Config = {
  asset_id: number;
  asset_name: string;
  asset_symbol: string;
  chains: Token2ChainConfig[];
}
export type Token2ChainConfig = {
  chain: string;
  symbol: string;
  name: string;
  decimals: number;
  min_transfer: number;

  //optional params
  address?: string;
  asset_id?: number;
  isNative?: boolean;
  vault_id?: number;
  vault_type?: string;
  vault_address?: string;
}