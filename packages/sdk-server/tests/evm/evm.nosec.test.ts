import { BridgeNetworks, GlitterEnvironment, Sleep } from "@glitter-finance/sdk-core";
import { GlitterSolanaPoller } from "../../src/lib/chains/solana/poller.solana";
import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/glitterSDKServer";
import * as assert from "assert";
import * as util from "util";

import test1Expected from './results/evm.nosec.json'
// import test2Expected from './results/tron.circle.TGUSL4VtESnWQfy2G6RmCNJT6eqqfcR6om.json'
import { Cursor, CursorToString } from "../../src/lib/common/cursor";
import { mainnetAPI as mainAPI } from "../config/mainnet-api"

describe("EVM Poller NOSEC Tests ", () => {

    //Initialize SDK
    let sdk: GlitterSDKServer;
    let poller: GlitterPoller | undefined;

    //Before All tests -> create new SDK
    beforeAll(async () => {
        //Initialize SDK
        sdk = new GlitterSDKServer(GlitterEnvironment.mainnet, mainAPI, 25);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Avalanche]);

        //local references for ease of use
        poller = sdk.poller(BridgeNetworks.Avalanche);
    });

    //Default Cursor Test
    it("AVAX NOSEC Test", async () => {

        //Get Poller & token cursor
        if (!poller) throw Error("Poller is undefined");
        const cursor = poller.tokenV2Cursor;
        assert.ok(cursor != undefined, "Cursor is undefined");

        const result = await poller.poll(sdk, cursor);
        const stringify = `
            {
                "Cursor": ${CursorToString(result.cursor)},
                "Txns": ${JSON.stringify(result.txns)}
            }`;

        const expectedConfig: any = test1Expected;
        // if (cursor.address === "TAG83nhpF82P3r9XhFTwNamgv1BsjTcz6v") {
        //     expectedConfig = test1Expected;
        // } else if (cursor.address === "TGUSL4VtESnWQfy2G6RmCNJT6eqqfcR6om") {
        //     expectedConfig = test2Expected;
        // } else {
        //     console.log(stringify);
        //     throw Error("Unknown Cursor Address");
        // }

        const expectedString = `
            {
                "Cursor": ${CursorToString(expectedConfig.Cursor)},
                "Txns": ${JSON.stringify(expectedConfig.Txns)}
            }`

        console.log(stringify);
        console.log("-------------------");
        console.log(expectedString);

        assert.ok(expectedString === stringify, "Expected and Actual are not equal.")

        await Sleep(5000);

        Promise.resolve();
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
