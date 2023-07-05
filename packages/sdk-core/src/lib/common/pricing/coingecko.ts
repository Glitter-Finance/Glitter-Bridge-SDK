import axios from 'axios';

const cg_cache: {
  [coingeckoId: string]: {
    usdPrice: number;
    updatedAt: number;
  };
} = {};

const cache_duration = 1000 * 60 *5; // 5 mins

/**
 * Retrieves the USD price for the specified Coingecko ID.
 *
 * @async
 * @function getPriceFromCoingecko
 * @param {string} coingeckoId - The Coingecko ID.
 * @returns {Promise<{ usdPrice: number, isFresh: boolean }>} - A Promise that resolves to an object containing the USD price and a boolean indicating if the price is fresh.
 */
export async function getPriceFromCoingecko (coingeckoId: string): Promise<{ usdPrice: number; isFresh: boolean;}> {

    //Check if the cache is still valid
    const current = new Date().getTime();
    if (cg_cache[coingeckoId]) {
        if (cg_cache[coingeckoId].updatedAt + cache_duration >= current) {
            return {
                usdPrice: cg_cache[coingeckoId].usdPrice,
                isFresh: false
            }
        }
    }

    //If not, fetch the price from coingecko
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
    const response = await axios.get(apiUrl);
    cg_cache[coingeckoId] = {
        usdPrice: response.data[coingeckoId].usd,
        updatedAt: current,
    };
    return{
        usdPrice: cg_cache[coingeckoId].usdPrice,
        isFresh: true
    }    
}