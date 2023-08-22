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
        sdk.createPollers([BridgeNetworks.solana]);

        //local references for ease of use
        //poller = sdk.poller(BridgeNetworks.solana);
    });

    //Default Cursor Test
    it("Parse Solana Txn", async () => {
        const result = await sdk.parseTxnID(BridgeNetworks.solana, "6Byg8M7HViiQCs1MhF2fyRBTWS4jBrdEhPKCaVoqLMyho5SRghiYBgDfKmJRrHDzgE7VmtK2NEXNvK97MkA1c3r", BridgeType.TokenV1);
        Promise.resolve();
    }, 120000);

    afterAll(async () => {
        console.log("Closing SDK");
    });

});
