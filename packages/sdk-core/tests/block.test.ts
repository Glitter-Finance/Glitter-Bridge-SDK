import { BridgeNetworks, BridgeV2Tokens, GlitterBridgeSDK, GlitterEnvironment, CurrentBlock, PriceDataStatus, Sleep, TokenPricing } from "../dist";
import { mainnetAPI as mainAPI, mainnetAPI } from "./config/mainnet-api"
import * as util from "util";

describe("Block Tests", () => {

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
    it("Main Block Test", async () => {

        for (let i = 0; i < 4; i++){
            for (const network in BridgeNetworks) {

                const block = await CurrentBlock.getCurrentBlock(sdk, network as BridgeNetworks);
                const blockInfo = util.inspect(block);
                console.log(`Network: ${network} - Block: ${blockInfo}`);
            }        

            if (i == 2) await Sleep(10000);
        }
            
        Promise.resolve();
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
