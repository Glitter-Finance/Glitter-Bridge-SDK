import { BridgeNetworks, BridgeV2Tokens, GlitterBridgeSDK, GlitterEnvironment, PriceDataStatus, Sleep, TokenPricing } from "../dist";
import { mainnetAPI as mainAPI, mainnetAPI } from "./config/mainnet-api"
import * as util from "util";

describe("Pricing Tests", () => {

    //Initialize SDK
    let sdk: GlitterBridgeSDK;

    //Before All tests -> create new SDK
    beforeAll(async () => {
        //Initialize SDK
        sdk = new GlitterBridgeSDK();
        sdk.setEnvironment(GlitterEnvironment.mainnet);
        sdk.connect([
            BridgeNetworks.algorand,
            BridgeNetworks.solana,
            BridgeNetworks.Ethereum,
            BridgeNetworks.Polygon,
            BridgeNetworks.Avalanche,
            BridgeNetworks.Arbitrum,
            BridgeNetworks.Binance,
            BridgeNetworks.Zkevm,
            BridgeNetworks.Optimism,
            BridgeNetworks.TRON,
        ], mainAPI);       
    });

    //Default Cursor Test
    it("Main Pricing Test", async () => {

        //Get tokens
        const tokens = BridgeV2Tokens.getTokenList();
        if (!tokens) throw new Error("No tokens found");

        //DO inner loop 5 times
        for (let i = 0; i < 5; i++) {
        //Loop through tokens
            for (const token of tokens) {      
                let cached = false;  
                try{
                //Get price
                    const price = await TokenPricing.getPrice(token);
                    const priceSTR = util.inspect(price);
                    console.log(`Token: ${token.asset_symbol} - Price: ${priceSTR}`);
                    if (price.status === PriceDataStatus.Cached) cached = true;

                } catch (err) {
                    console.log(`XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`);
                    console.log(`Token: ${token.asset_symbol} - Error`);
                    console.log(`XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`);
                }
            
                //add to redis

                if (!cached) await Sleep(1000);

            }
        }        
            
        Promise.resolve();
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
