import {
    BridgeNetworks,
    GlitterEnvironment,
    GlitterBridgeSDK,
} from "@glitter-finance/sdk-core";
import * as assert from "assert";
import * as util from "util";

describe("Solana Poller Token V2 Tests ", () => {
    //Initialize SDK
    let sdk: GlitterBridgeSDK;

    //Before All tests -> create new SDK
    beforeAll(async () => {
    //Initialize SDK
        sdk = new GlitterBridgeSDK();
        sdk.setEnvironment(GlitterEnvironment.testnet);
        sdk.connect([BridgeNetworks.solana]);
    });

    //Default Cursor Test
    it("Check Connection", async () => {
        assert.ok(sdk, "SDK is undefined");
        assert.ok(sdk.solana, "SDK Solana is undefined");
        assert.ok(
            sdk.solana.tokenBridgeV2Address,
            "SDK Solana Token Bridge V2 Address is undefined"
        );
    });

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
