
import BigNumber from "bignumber.js";
import { BridgeToken, RoutingDefault, SetRoutingUnits } from "../src/lib/common";
import { RoutingHelper } from "../src/lib/common/routing/routing";

describe("Routing Tests", () => {

    it("RoutingDefault", () => {
        const routing = RoutingDefault();
        expect(routing.from.network).toBe("");
        expect(routing.from.address).toBe("");
        expect(routing.from.token).toBe("");
        expect(routing.from.txn_signature).toBe("");
        expect(routing.to.network).toBe("");
        expect(routing.to.address).toBe("");
        expect(routing.to.token).toBe("");
        expect(routing.to.txn_signature).toBe("");
        expect(routing.amount).toBe(undefined);
        expect(routing.units).toBe(undefined);
    });
    it ("SetRoutingUnits", () => {
        const routing = RoutingDefault();
        routing.amount = BigNumber(10.215351);

        let token:BridgeToken = {
            address:"",
            decimals:6,
            name:"",
            symbol:"",
            network:""
        }

        SetRoutingUnits(routing, token);
        expect(routing.units).toEqual(BigNumber(10_215_351));    
    });
    it ("Test Routing Helper", () => {

        let token:BridgeToken = {
            address:"",
            decimals:6,
            name:"",
            symbol:"",
            network:""
        }

        //This should pass
        let value = 10.1234560;
        let units = RoutingHelper.BaseUnits_FromReadableValue(value, token.decimals);
        let returnValue = RoutingHelper.ReadableValue_FromBaseUnits(units, token.decimals);
        expect(returnValue).toEqual(BigNumber(value));


        value = 10.1234561;
        units = RoutingHelper.BaseUnits_FromReadableValue(value, token.decimals);
        returnValue = RoutingHelper.ReadableValue_FromBaseUnits(units, token.decimals);
        expect(returnValue).toEqual(BigNumber(10.123456));

    });

});