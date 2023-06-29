import { BridgeV2Tokens, Token2Config } from "../tokens";
import { getPriceFromCoingecko } from "./coingecko";
import { fromCoinMarketCap } from "./coinmarketcap";

export type TokenPriceData = {
    average_price: number;
    cmc_price: number;
    cg_price: number;
    timestamp: number;
    status: PriceDataStatus;
}
export enum PriceDataStatus {
    Fresh = "Fresh",
    Updated = "Updated",
    Cached = "Cached",
    NotFound = "NotFound"
}

export class TokenPricing {

    //Local Vars
    private static _cmc_api_key: string | undefined = undefined;
    public static isLoaded = false;

    public static loadConfig(apiKey: string) {
        this._cmc_api_key = apiKey;
        this.isLoaded = true;
    }  

    public static async updatePrice(token: Token2Config): Promise<TokenPriceData> {

        let cg_return;
        let cmc_return ;

        //Try to get price from coingecko
        if (token.coingecko_id) {
            try {
                cg_return = await getPriceFromCoingecko(token.coingecko_id);
            } catch (e) {
                console.error(e);
            }
        }

        //try to get price from coinmarketcap
        if (token.cmc_id) {
            try {
                cmc_return = await fromCoinMarketCap(token.cmc_id, this._cmc_api_key || "");
            } catch (e) {
                console.error(e);
            }
        }

        //Get prices
        const cg_price = cg_return?.usdPrice || 0;
        const cmc_price = cmc_return?.usdPrice || 0;

        //Get fresh count
        let fresh_count = 0;
        if (cg_return?.isFresh) fresh_count++;
        if (cmc_return?.isFresh) fresh_count++;   

        //Get status
        let status: PriceDataStatus = PriceDataStatus.Cached;
        if (fresh_count === 2) status = PriceDataStatus.Fresh;
        if (fresh_count === 1) status = PriceDataStatus.Updated;

        //average price
        const price_sum = cg_price + cmc_price;
        let price_count = 0;
        if (cg_price > 0) price_count++;
        if (cmc_price > 0) price_count++;
        const price = price_count == 0 ? 0 : price_sum / price_count;    
        if (price === 0) status = PriceDataStatus.NotFound;

        //Get return value
        const returnValue: TokenPriceData = {
            average_price: price,
            timestamp: Date.now(),
            cmc_price: cmc_price,
            cg_price: cg_price,
            status: status,
        }

        return returnValue;
    }
    
    public static async getPrice(symbol: string): Promise<TokenPriceData>
    public static async getPrice(token: Token2Config): Promise<TokenPriceData>
    public static async getPrice(symbolorToken?: string | Token2Config): Promise<TokenPriceData> {

        //get token from symbol
        let tokenConfig: Token2Config | undefined;
        if (typeof symbolorToken === 'string') {
            tokenConfig = BridgeV2Tokens.getTokenConfig(symbolorToken);
        } else {
            tokenConfig = symbolorToken as Token2Config;
        }
        if (!tokenConfig) throw new Error("Token not found");

        //Get and return price
        const price = await this.updatePrice(tokenConfig);
        return price;
    }
}