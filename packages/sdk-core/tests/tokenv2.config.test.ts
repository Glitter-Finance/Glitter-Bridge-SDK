// import assert from "assert";
// import { GlitterBridgeSDK, GlitterEnvironment } from "../src";
// import { BridgeV2Tokens } from "../src/lib/common/tokens/BridgeV2Tokens";

// describe("TokenV2 Config Tests", () => {

//     //Initialize SDK
//     let sdk: GlitterBridgeSDK;

//     //Before All tests -> create new SDK
//     beforeAll(async () => {

//         //Initialize SDK
//         sdk = new GlitterBridgeSDK();
//         sdk.setEnvironment(GlitterEnvironment.testnet);    

//     });   

//     it("Config Loaded", async () => {
//         if (!BridgeV2Tokens.isLoaded) throw Error("Config is not loaded");

//         //Check if some tokens are present
//         const usdc = BridgeV2Tokens.getToken("USDC");
//         assert(usdc != undefined, "USDC is undefined");
      
//         Promise.resolve();
//     }, 120_000);

//     afterAll(async () => {
//         console.log("Closing SDK");
//     });
// });
