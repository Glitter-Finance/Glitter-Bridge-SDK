import { Token2ConfigList } from "../lib";
import { config as mConfig } from "./mainnet"
import { config as tConfig } from "./testnet"

import axios from "axios";

export const mainnetConfig = mConfig;
export const testnetConfig = tConfig;

//export const mainnetTokenConfig = require('./mainnet-tokens.json');
//export const testnetTokenConfig = require('./testnet-tokens.json');

export { default as mainnetTokenConfig } from "./mainnet-tokens.json";
export { default as testnetTokenConfig } from "./testnet-tokens.json";

// let mainnetTokenConfig: Token2ConfigList;
// let testnetTokenConfig: Token2ConfigList;

// function loadJSON(filename: string) {
//     return axios.get(filename)
//         .then(response => response.data);
// }

// async function main(){
//     mainnetTokenConfig = await loadJSON("./mainnet-tokens.json") as Token2ConfigList;
//     testnetTokenConfig = await loadJSON("./testnet-tokens.json") as Token2ConfigList;
// }

// main();

// export function GetMainnetTokenConfig(){
//     return mainnetTokenConfig;
// }
// export function GetTestnetTokenConfig(){
//     return testnetTokenConfig;
// }