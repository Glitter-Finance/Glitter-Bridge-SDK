import { BridgeNetworks, GlitterEnvironment } from "@glitter-finance/sdk-core";
import { GlitterSDKServer, GlitterPoller } from "@glitter-finance/sdk-server";
import * as assert from "assert";
import * as util from "util";

describe("Solana Poller Token V2 Tests ", () => {
    //Initialize SDK
    let sdk: GlitterSDKServer;
    let poller: GlitterPoller | undefined;

    //Before All tests -> create new SDK
    beforeAll(async () => {
    //Initialize SDK
        sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.solana]);

        //local references for ease of use
        poller = sdk.poller(BridgeNetworks.solana);
    });

    //Default Cursor Test
    it("Default Cursor Test", async () => {
        if (!poller) throw Error("Poller is undefined");
        const cursor = poller.tokenV2Cursor;
        assert.ok(cursor);

        const result = await poller.poll(sdk, cursor);
        console.log(util.inspect(result, false, null, true /* enable colors */));
    });

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
