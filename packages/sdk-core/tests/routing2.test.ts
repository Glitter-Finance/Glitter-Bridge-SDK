import assert from "assert";
import { BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment, RoutingHelper } from "../src";
import { BridgeV2Tokens } from "../src/lib/common/tokens/BridgeV2Tokens";
import * as Util from "util";

describe("TokenV2 Config Tests", () => {

    //Initialize SDK
    let sdk: GlitterBridgeSDK;

    //Before All tests -> create new SDK
    beforeAll(async () => {

        //Initialize SDK
        sdk = new GlitterBridgeSDK();
        sdk.setEnvironment(GlitterEnvironment.testnet);    

    });   

    it("Check RoutingHelper", async () => {
        if (!BridgeV2Tokens.isLoaded) throw Error("Config is not loaded");

        //Check Base Units
        const baseUnits = RoutingHelper.BaseUnits_FromReadableValue(2.5, 10);
        console.log(`Base Units: ${baseUnits}`);
        assert.ok(baseUnits.toNumber() == 25_000_000_000, "Base Units are unexpected");

        //Check Readable Units
        const readable = RoutingHelper.ReadableValue_FromBaseUnits(baseUnits, 10);
        console.log(`Readable Units: ${readable}`);
        assert.ok(readable.toNumber() == 2.5, "Readable Units are unexpected");

        //Check Unit Shift
        const shifted = RoutingHelper.BaseUnits_Shift(baseUnits, 10, 4);
        console.log(`Shifted Units: ${shifted}`);
        assert.ok(shifted.toNumber() == 25_000, "Shifted Units are unexpected");

        //Check Unit Shift Value
        const shiftedValue = RoutingHelper.ReadableValue_FromBaseUnits(shifted, 4);
        console.log(`Shifted Value: ${shiftedValue}`);
        assert.ok(shiftedValue.toNumber() == readable.toNumber(), "Shifted Value is unexpected");

        Promise.resolve();
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
