import { BridgeNetworks, BridgeType, GlitterEnvironment, Sleep } from "@glitter-finance/sdk-core";
import { GlitterSolanaPoller } from "../../src/lib/chains/solana/poller.solana";
import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/glitterSDKServer";
import * as assert from "assert";
import * as util from "util";

describe("Parsing Test", () => {

    //Initialize SDK
    let sdk: GlitterSDKServer;
    let poller: GlitterPoller | undefined;

    //Before All tests -> create new SDK
    beforeAll(async () => {
        //Initialize SDK
        sdk = new GlitterSDKServer(GlitterEnvironment.mainnet, undefined, 25);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.solana]);

        //local references for ease of use
        poller = sdk.poller(BridgeNetworks.solana);
    });

    //Default Cursor Test
    it("Parse Solana Txn", async () => {
        const result = await sdk.parseTxnID(BridgeNetworks.solana, "2Uhub9Wn3K9fmKU5hUpiLAMWWsJ9LE1hvheXJJM5P8vNuBcw4EyKLSfR3JtsMYfEH114B2MocM89DP35C8A91KU7", BridgeType.Circle);
        Promise.resolve();
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
