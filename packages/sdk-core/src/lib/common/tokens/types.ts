import {BridgeNetworks} from "../networks";

/**
 * Interface representing the base token configuration.
 * @interface BaseTokenConfig
 * @property {string} symbol - The symbol of the token.
 * @property {string} name - The name of the token.
 * @property {number} decimals - The number of decimal places for the token.
 * @property {number} [feeDivisor] - The fee divisor for the token.
 * @property {number} [minTransfer] - The minimum transfer amount for the token.
 * @property {number} [maxTransfer] - The maximum transfer amount for the token.
 * @property {bigint} [totalSupply] - The total supply of the token.
 * @property {string} [wrappedSymbol] - The symbol of the wrapped version of the token.
 */
interface BaseTokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  feeDivisor?: number;
  minTransfer?: number;
  maxTransfer?: number;
  totalSupply?: bigint;
  wrappedSymbol?: string;
  supportedDestination?: BridgeNetworks[];
}

/**
 * Type representing the bridge token configuration.
 * @typedef {object} BridgeTokenConfig
 * @property {string} address - The address of the token.
 * @property {string} symbol - The symbol of the token.
 * @property {string} name - The name of the token.
 * @property {number} decimals - The number of decimal places for the token.
 * @property {number} [feeDivisor] - The fee divisor for the token.
 * @property {number} [minTransfer] - The minimum transfer amount for the token.
 * @property {number} [maxTransfer] - The maximum transfer amount for the token.
 * @property {bigint} [totalSupply] - The total supply of the token.
 * @property {string} [wrappedSymbol] - The symbol of the wrapped version of the token.
 */
export type BridgeTokenConfig = { 
  address: string;
} & BaseTokenConfig;

/**
 * Type representing the Algorand standard asset configuration.
 * @typedef {object} AlgorandStandardAssetConfig
 * @property {number} assetId - The asset ID of the Algorand standard asset.
 * @property {string} symbol - The symbol of the token.
 * @property {string} name - The name of the token.
 * @property {number} decimals - The number of decimal places for the token.
 * @property {number} [feeDivisor] - The fee divisor for the token.
 * @property {number} [minTransfer] - The minimum transfer amount for the token.
 * @property {number} [maxTransfer] - The maximum transfer amount for the token.
 * @property {bigint} [totalSupply] - The total supply of the token.
 * @property {string} [wrappedSymbol] - The symbol of the wrapped version of the token.
 */
export type AlgorandStandardAssetConfig = {
  assetId: number;
} & BaseTokenConfig;

/**
 * Type representing the Algorand native token configuration.
 * @typedef {object} AlgorandNativeTokenConfig
 * @property {boolean} isNative - Indicates if the token is the native token of the Algorand blockchain.
 * @property {string} symbol - The symbol of the token.
 * @property {string} name - The name of the token.
 * @property {number} decimals - The number of decimal places for the token.
 * @property {number} [feeDivisor] - The fee divisor for the token.
 * @property {number} [minTransfer] - The minimum transfer amount for the token.
 * @property {number} [maxTransfer] - The maximum transfer amount for the token.
 * @property {bigint} [totalSupply] - The total supply of the token.
 * @property {string} [wrappedSymbol] - The symbol of the wrapped version of the token.
 */
export type AlgorandNativeTokenConfig = {
  isNative: boolean;
} & BaseTokenConfig;

/**
 * Type representing a list of Token2 configurations.
 * @typedef {object} Token2ConfigList
 * @property {Token2Config[]} tokens - An array of Token2 configurations.
 */
export type Token2ConfigList = {
  "tokens": Token2Config[];
}

/**
 * Type representing a Token2 configuration.
 * @typedef {object} Token2Config
 * @property {number} asset_id - The asset ID of the Token2 token.
 * @property {string} asset_name - The name of the Token2 token.
 * @property {string} asset_symbol - The symbol of the Token2 token.
 * @property {string} [cmc_id] - The CoinMarketCap ID of the Token2 token.
 * @property {string} [coingecko_id] - The CoinGecko ID of the Token2 token.
 * @property {number} asset_bridge_fee - The bridge fee for the Token2 token.
 * @property {Token2ChainConfig[]} chains - An array of Token2ChainConfig objects representing the supported chains for the Token2 token.
 */
export type Token2Config = {
  asset_id: number;
  asset_name: string;
  asset_symbol: string;
  cmc_id?: string;
  coingecko_id?: string;
  asset_bridge_fee: number;
  chains: Token2ChainConfig[];
}

/**
 * Type representing a Token2 chain configuration.
 * @typedef {object} Token2ChainConfig
 * @property {string} chain - The name of the chain.
 * @property {string} symbol - The symbol of the token on the chain.
 * @property {string} name - The name of the token on the chain.
 * @property {number} decimals - The number of decimal places for the token on the chain.
 * @property {number} min_transfer - The minimum transfer amount for the token on the chain.
 * @property {string} [address] - The address of the token on the chain.
 * @property {number} [asset_id] - The asset ID of the token on the chain.
 * @property {boolean} [isNative] - Indicates if the token is the native token of the chain.
 * @property {number} [vault_id] - The vault ID of the token on the chain.
 * @property {string} [vault_type] - The vault type of the token on the chain.
 * @property {string} [vault_address] - The address of the vault for the token on the chain.
 */
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