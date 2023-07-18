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
        sdk.createPollers([BridgeNetworks.Ethereum]);

        //local references for ease of use
        //poller = sdk.poller(BridgeNetworks.solana);
    });

    //Default Cursor Test
    it("Parse Solana Txn", async () => {
        const result = await sdk.parseTxnID(BridgeNetworks.Ethereum, "0x7ddd9f53120c5ebe1d7e7dd0deffec9612222aa1727d11fcb4d82b9b2257c793", BridgeType.Circle);
        Promise.resolve();
    }, 120000);

    afterAll(async () => {
        console.log("Closing SDK");
    });

});
