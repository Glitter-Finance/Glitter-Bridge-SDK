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
        const result = await sdk.parseTxnID(BridgeNetworks.solana, "bLgGh73VJK1S1ujA96j9GgS2r3HQzqtVpuDpuAU6roLyxWYKr1vTmaSHRcR8uyRjx9s2gjTbi1tinGdsiLqT8kT", BridgeType.TokenV1);
        Promise.resolve();
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
