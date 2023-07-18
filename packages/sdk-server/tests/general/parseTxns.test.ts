import { BridgeNetworks, BridgeType, GlitterEnvironment } from "@glitter-finance/sdk-core";
//import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/glitterSDKServer";

describe("Parsing Test", () => {

    //Initialize SDK
    let sdk: GlitterSDKServer;
    //let poller: GlitterPoller | undefined;

    //Before All tests -> create new SDK
    beforeAll(async () => {
        //Initialize SDK
        sdk = new GlitterSDKServer(GlitterEnvironment.mainnet, undefined, 25);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Avalanche]);

        //local references for ease of use
        //poller = sdk.poller(BridgeNetworks.solana);
    });

    //Default Cursor Test
    it("Parse Solana Txn", async () => {
        const result = await sdk.parseTxnID(BridgeNetworks.Avalanche, "0xab959a74a967dd05d7dbd5cf8fa55eaf0260f54bbd0ce8246520208f8303ac6f", BridgeType.Circle);
        Promise.resolve();
    }, 120000);

    afterAll(async () => {
        console.log("Closing SDK");
    });

});
