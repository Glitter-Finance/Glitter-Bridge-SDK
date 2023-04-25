import { config as mConfig } from "./mainnet"
import { config as tConfig } from "./testnet"
import { testnetAPI as tAPI } from "./testnet-api"

export const mainnetConfig = mConfig;
export const testnetConfig = tConfig;

export const testnetApi = tAPI;

export { default as mainnetTokenConfig } from "./mainnet-tokens.json";
export { default as testnetTokenConfig } from "./testnet-tokens.json";
