declare global {
    namespace NodeJS {
        interface ProcessEnv {
            LAST_MIN_ROUND: string;
            LAST_TXN_ID: string;
            ETH_API_KEY: string;
            ETH_API_URL: string;
            AVAX_API_KEY: string;
            AVAX_API_URL: string;
            POLYGON_API_KEY: string;
            POLYGON_API_URL: string;
        }
    }
}
