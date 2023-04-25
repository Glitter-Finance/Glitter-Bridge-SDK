import { config as mConfig } from "./mainnet"
import { config as tConfig } from "./testnet"

export const mainnetConfig = mConfig;
export const testnetConfig = tConfig;

export { default as mainnetTokenConfig } from "./mainnet-tokens.json";
export { default as testnetTokenConfig } from "./testnet-tokens.json";
