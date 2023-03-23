import { BridgeNetworks, GlitterEnvironment } from "@glitter-finance/sdk-core";
import { GlitterSDKServer, GlitterPoller } from "@glitter-finance/sdk-server";
import * as assert from "assert";

describe("Solana Poller Token V2 Tests ", () => {
    //Initialize SDK
    let sdk: GlitterSDKServer;

    //Before All tests -> create new SDK
    beforeAll(async () => {
    //Initialize SDK
        sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.solana]);
    });

    //Default Cursor Test
    it("Check Connection", async () => {
        assert.ok(sdk, "Server SDK is undefined");
        assert.ok(sdk.sdk, "Glitter SDK is undefined");
        assert.ok(sdk.sdk.solana, "SDK Solana is undefined");
        assert.ok(
            sdk.sdk.solana.tokenBridgeV2Address,
            "SDK Solana Token Bridge V2 Address is undefined"
        );
    });

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
