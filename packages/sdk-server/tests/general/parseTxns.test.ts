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
        sdk.createPollers([BridgeNetworks.Polygon]);

        //local references for ease of use
        //poller = sdk.poller(BridgeNetworks.solana);
    });

    //Default Cursor Test
    it("Parse Solana Txn", async () => {
        const result = await sdk.parseTxnID(BridgeNetworks.Polygon, "0x5516da80fb9d241ca9603959ee5f048907da4ae86e8b26d5e5a41dab5962646a", BridgeType.Circle);
        Promise.resolve();
    }, 120000);

    afterAll(async () => {
        console.log("Closing SDK");
    });

});
