import { config as mConfig } from "./mainnet"
import { config as tConfig } from "./testnet"

import { Token2ConfigList } from "../lib";

export const mainnetConfig = mConfig;
export const testnetConfig = tConfig;

export const mainnetTokenConfig = loadJSON('./mainnet-tokens.json')as Token2ConfigList;
export const testnetTokenConfig = loadJSON('./testnet-tokens.json')as Token2ConfigList;

function loadJSON(filename: string) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', filename, false);
    xhr.send();
    if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        return data;
    } else {
        throw new Error('Error loading JSON file');
    }
}