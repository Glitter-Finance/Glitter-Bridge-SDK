import { BridgeNetworks, BridgeType, GlitterEnvironment } from "@glitter-finance/sdk-core";
//import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/glitterSDKServer";

import { mainnetAPI as mainAPI, mainnetAPI } from "../config/mainnet-api"

describe("Parsing Test", () => {

    //Initialize SDK
    let sdk: GlitterSDKServer;
    //let poller: GlitterPoller | undefined;

    //Before All tests -> create new SDK
    beforeAll(async () => {
        //Initialize SDK
        sdk = new GlitterSDKServer(GlitterEnvironment.mainnet, mainnetAPI, 25);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Optimism]);

        //local references for ease of use
        //poller = sdk.poller(BridgeNetworks.solana);
    });

    //Default Cursor Test
    it("Parse Solana Txn", async () => {
        const result = await sdk.parseTxnID(BridgeNetworks.Optimism, "0x2c8f3eb3164aa2ac9f16b65042be0fc1cbb457410c1d0ed242ac79ce555df29e", BridgeType.TokenV2);
        Promise.resolve();
    }, 120000);

    afterAll(async () => {
        console.log("Closing SDK");
    });

});
