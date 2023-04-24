import { BridgeNetworks } from "../networks";
import { BridgeTokenConfig, AlgorandStandardAssetConfig, AlgorandNativeTokenConfig, Token2Config, Token2ConfigList, Token2ChainConfig, } from "./types";
import axios from 'axios';

export class BridgeV2Tokens {

    private static _tokenConfig : Token2ConfigList|undefined = undefined;
    public static isLoaded = false;

    public static loadConfig(config: Token2ConfigList) {
        this._tokenConfig = config;
        this.isLoaded = true;
    }  

    public static getToken(nativeSymbol: string): Token2Config | undefined {

        //Fail safe
        if (!this._tokenConfig || !this._tokenConfig.tokens) return undefined;

        //Get the token
        const token = this._tokenConfig.tokens?.find((x) => x.asset_symbol.toLowerCase() === nativeSymbol.toLowerCase());
        return token;
    }
    public static getTokenByChain(network: BridgeNetworks, symbol: string): Token2ChainConfig | undefined {
        
        //Get the token
        const token = this.getToken(symbol);
        if (!token) return undefined;
       
        //get chain version
        const chainToken = token.chains?.find((x) => x.chain.toLowerCase() === network.toLowerCase());
        return chainToken;
    }
    public static getFromAddress(network: BridgeNetworks, address: string): Token2Config | undefined {
       
        //Fail safe
        if (!this._tokenConfig || !this._tokenConfig.tokens) return undefined;

        for (const token of this._tokenConfig?.tokens ?? []) {
            for (const chain of token.chains ?? []) {
                if (chain.chain.toLowerCase() === network.toLowerCase() && chain.address?.toLowerCase() === address.toLowerCase()) {
                    return token;
                }
            }
        }
    }
    public static getFromAssetID(network: BridgeNetworks, assetId: number): Token2Config | undefined {
       
        //Fail safe
        if (!this._tokenConfig || !this._tokenConfig.tokens) return undefined;

        for (const token of this._tokenConfig?.tokens ?? []) {
            for (const chain of token.chains ?? []) {
                if (chain.chain.toLowerCase() === network.toLowerCase() && chain.asset_id === assetId) {
                    return token;
                }
            }
        }
    }
   
}
