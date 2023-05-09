import { BridgeNetworks, GlitterEnvironment, Sleep } from "@glitter-finance/sdk-core";
import { GlitterSolanaPoller } from "../../src/lib/chains/solana/poller.solana";
import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/lib/glitterSDKServer";
import * as assert from "assert";
import * as util from "util";

import test1Expected from './results/solana.usdc.Av47VxT8GpGXHYc3aG7fKddgZjCuZEb5yF3BCaXyE7wu.json'
import test2Expected from './results/solana.usdc.HrrpuLCq2ewozVZU5sFrWL6oRvFe8KH1VMhVQLCcWpdy.json'
import test3Expected from './results/solana.usdc.8Cb6eKCiowqsfYoLeaQf9voTHv1nV6rKjBvMQwLEGoDJ.json'
import test4Expected from './results/solana.usdc.CWmY521qXB29Hwp3WBzyX1huApRdQu4kjrcxZpa2St7d.json'
import { Cursor } from "../../src/lib/common/cursor";

describe("Solana Poller USDC Tests ", () => {
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
        const cursor = poller.usdcCursors;
        assert.ok(cursor != undefined, "Cursor is undefined");

        for await (const localCursor of cursor) {
      
            const cursorCopy = { ...localCursor } as Cursor
            
            assert.ok(poller!= undefined, "Poller is undefined");
            const result = await poller.poll(sdk, cursorCopy);
            // console.log(util.inspect(result, false, null, true /* enable colors */));

            const stringify = JSON.stringify(result);
            let expectedConfig:any = null;
            if (cursorCopy.address === "Av47VxT8GpGXHYc3aG7fKddgZjCuZEb5yF3BCaXyE7wu") {
                expectedConfig = test1Expected;
            } else if (cursorCopy.address === "HrrpuLCq2ewozVZU5sFrWL6oRvFe8KH1VMhVQLCcWpdy") {
                expectedConfig = test2Expected;
            } else if (cursorCopy.address === "8Cb6eKCiowqsfYoLeaQf9voTHv1nV6rKjBvMQwLEGoDJ") {
                expectedConfig = test3Expected;
            } else if (cursorCopy.address === "CWmY521qXB29Hwp3WBzyX1huApRdQu4kjrcxZpa2St7d") {
                expectedConfig = test4Expected;
            } else {
                console.log(stringify);
                throw Error("Unknown Cursor Address");
            }
            
            const expectedString = JSON.stringify(expectedConfig);

            console.log(stringify);
            console.log("-------------------");
            console.log(expectedString);

            assert.ok(expectedString === stringify, "Expected and Actual are not equal.")

            await Sleep(5000);
        }
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
