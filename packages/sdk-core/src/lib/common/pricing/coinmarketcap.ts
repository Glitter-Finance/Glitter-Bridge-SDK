import axios from 'axios';

const cmc_cache: {
    [coingeckoId: string]: {
        usdPrice: number;
        updatedAt: number;
    };
} = {};

const cache_duration = 1000 * 60 *5; // 5 mins

export type CoinMarketCapQuoteResponse = {
    "status": {
        "timestamp": Date;
        "error_code": number;
        "error_message": string | null;
        "elapsed": number;
        "credit_count": number;
        "notice": any;
    },
    "data": Record<string, Array<{
        "id": number;
        "name": string;
        "symbol": string;
        "slug": string;
        "num_market_pairs": number;
        "date_added": Date;
        "tags": Array<{
            "slug": string;
            "name": string;
            "category": string;
        }>,
        "max_supply": number;
        "circulating_supply": number;
        "total_supply": number;
        "is_active": number;
        "platform": any;
        "cmc_rank": number;
        "is_fiat": number;
        "self_reported_circulating_supply": any;
        "self_reported_market_cap": any;
        "tvl_ratio": any;
        "last_updated": Date;
        "quote": Record<string, {
            "price": number;
            "volume_24h": number;
            "volume_change_24h": number;
            "percent_change_1h": number;
            "percent_change_24h": number;
            "percent_change_7d": number;
            "percent_change_30d": number;
            "percent_change_60d": number;
            "percent_change_90d": number;
            "market_cap": number;
            "market_cap_dominance": number;
            "fully_diluted_market_cap": number;
            "tvl": any;
            "last_updated": Date;
        }>
    }>>
}

/**
 * Retrieves the USD price for the specified cryptocurrency symbol from CoinMarketCap.
 *
 * @async
 * @function fromCoinMarketCap
 * @param {string} cryptoSymbol - The cryptocurrency symbol.
 * @param {string} api_key - The API key for CoinMarketCap.
 * @returns {Promise<{ usdPrice: number, isFresh: boolean }>} - A Promise that resolves to an object containing the USD price and a boolean indicating if the price is fresh.
 */
export async function fromCoinMarketCap(cryptoSymbol: string, api_key:string):Promise<{ usdPrice: number; isFresh: boolean;}> {
   
    //Check Cache
    const current = new Date().getTime();
    if (cmc_cache[cryptoSymbol]) {
        if (cmc_cache[cryptoSymbol].updatedAt + cache_duration >= current) {
            return {
                usdPrice: cmc_cache[cryptoSymbol].usdPrice,
                isFresh: false
            }
        }
    }

    //Get Price Response
    const response = await axios.get(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${cryptoSymbol}`,
        { headers: { 'X-CMC_PRO_API_KEY': api_key } }
    )
    const responseData = response.data as CoinMarketCapQuoteResponse
    const data = responseData.data[cryptoSymbol].find(x => x.symbol === cryptoSymbol)

    //Get price
    let price = 0;
    if (data && data.quote['USD']) {
        price = data.quote['USD'].price;
    }

    cmc_cache[cryptoSymbol] = {
        usdPrice: price,
        updatedAt: current,
    };
    return {
        usdPrice: cmc_cache[cryptoSymbol].usdPrice,
        isFresh: true
    }    

}