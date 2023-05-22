import assert from "assert";
import { BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment } from "../src";
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

    it("Check GTT Token", async () => {
        if (!BridgeV2Tokens.isLoaded) throw Error("Config is not loaded");

        const GTT_JSON = `{"asset_id":8,"asset_name":"Glitter Test Token","asset_symbol":"GTT","chains":[{"chain":"Ethereum","symbol":"GTT","name":"Glitter Test Token","decimals":18,"address":"0x3aEE2ca29df1EdB741c299ca1903C5cE2DFC0F9d","min_transfer":0,"vault_id":15,"vault_type":"outgoing","vault_address":"0x4d23A780C6Ebc05145bF28d81B0013519b28253E"},{"chain":"Arbitrum","symbol":"xGTT","name":"Glitter Wrapped Test Token","decimals":18,"address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2","min_transfer":0,"vault_id":4,"vault_type":"incoming","vault_address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2"},{"chain":"zkEVM","symbol":"xGTT","name":"Glitter Wrapped Test Token","decimals":18,"address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2","min_transfer":0,"vault_id":4,"vault_type":"incoming","vault_address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2"},{"chain":"Polygon","symbol":"xGTT","name":"Glitter Wrapped Test Token","decimals":18,"address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2","min_transfer":0,"vault_id":4,"vault_type":"incoming","vault_address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2"},{"chain":"Avalanche","symbol":"xGTT","name":"Glitter Wrapped Test Token","decimals":18,"address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2","min_transfer":0,"vault_id":4,"vault_type":"incoming","vault_address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2"},{"chain":"Binance","symbol":"xGTT","name":"Glitter Wrapped Test Token","decimals":18,"address":"0x511f17EBC47B0316e6E934c1E0166F37376B1C59","min_transfer":0,"vault_id":4,"vault_type":"incoming","vault_address":"0x511f17EBC47B0316e6E934c1E0166F37376B1C59"},{"chain":"Optimism","symbol":"xGTT","name":"Glitter Wrapped Test Token","decimals":18,"address":"0x08486dEf8dfDe9Fe0C7e3A80fC399d86e3177C6b","min_transfer":0,"vault_id":4,"vault_type":"incoming","vault_address":"0x08486dEf8dfDe9Fe0C7e3A80fC399d86e3177C6b"}]}`;
        const GTT_Eth_JSON = `{"chain":"Ethereum","symbol":"GTT","name":"Glitter Test Token","decimals":18,"address":"0x3aEE2ca29df1EdB741c299ca1903C5cE2DFC0F9d","min_transfer":0,"vault_id":15,"vault_type":"outgoing","vault_address":"0x4d23A780C6Ebc05145bF28d81B0013519b28253E"}`;
        const GTT_Arbitrum_JSON = `{"chain":"Arbitrum","symbol":"xGTT","name":"Glitter Wrapped Test Token","decimals":18,"address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2","min_transfer":0,"vault_id":4,"vault_type":"incoming","vault_address":"0x248e44481DB39EEF6F805badAEdBAbaF439Be2B2"}`;

        //Get GTT Token Config
        const GTT = BridgeV2Tokens.getTokenConfig("GTT");
        assert.ok(GTT != undefined, "GTT is undefined");
        console.log(`GTT Returned Results: ${JSON.stringify(GTT)}`);
        assert.ok(GTT_JSON == JSON.stringify(GTT), "GTT value is unexpected");

        //Get Eth GTT Chain Token Config
        const GTT_Eth= BridgeV2Tokens.getChainConfig(BridgeNetworks.Ethereum, "GTT");
        assert.ok(GTT_Eth != undefined, "GTT_Eth is undefined");
        console.log(`GTT_Eth Returned Results: ${JSON.stringify(GTT_Eth)}`);
        assert.ok(GTT_Eth_JSON == JSON.stringify(GTT_Eth), "GTT_Eth value is unexpected");
       
        //Get GTT Token Config parent from child.
        const GTT_Eth_Parent = BridgeV2Tokens.getChainConfigParent(GTT_Eth);
        assert.ok(GTT_Eth_Parent != undefined, "GTT_Eth_Parent is undefined");
        console.log(`GTT_Eth_Parent Returned Results: ${JSON.stringify(GTT_Eth_Parent)}`);
        assert.ok(GTT_JSON == JSON.stringify(GTT_Eth_Parent), "GTT_Eth_Parent value is unexpected");

        //Get GTT Eth Chain Token Config Child From Parent
        const GTT_Child_Eth = BridgeV2Tokens.getTokenConfigChild(GTT_Eth_Parent, BridgeNetworks.Ethereum);
        assert.ok(GTT_Child_Eth != undefined, "GTT_Child_Eth is undefined");
        console.log(`GTT_Child_Eth Returned Results: ${JSON.stringify(GTT_Child_Eth)}`);
        assert.ok(JSON.stringify(GTT_Eth) == JSON.stringify(GTT_Child_Eth), "GTT_Child_Eth value is unexpected");

        //Get GTT Token Config from Arbitrum xGTT
        const GTT_Arbitrum_Parent = BridgeV2Tokens.getTokenConfig(BridgeNetworks.Arbitrum, "xGTT");
        assert.ok(GTT_Arbitrum_Parent != undefined, "GTT_Arbitrum_Parent is undefined");
        console.log(`GTT_Arbitrum_Parent Returned Results: ${JSON.stringify(GTT_Arbitrum_Parent)}`);
        assert.ok(GTT_JSON == JSON.stringify(GTT_Arbitrum_Parent), "GTT_Arbitrum_Parent value is unexpected");

        //Get xGTT Arbitrum Chain Token Config
        const GTT_Arbitrum = BridgeV2Tokens.getChainConfig(BridgeNetworks.Arbitrum, "xGTT");
        assert.ok(GTT_Arbitrum != undefined, "GTT_Arbitrum is undefined");
        console.log(`GTT_Arbitrum Returned Results: ${JSON.stringify(GTT_Arbitrum)}`);
        assert.ok(GTT_Arbitrum_JSON == JSON.stringify(GTT_Arbitrum), "GTT_Arbitrum value is unexpected");

        //Check if GTT_Arbitrum and GTT_Ethereum are derivatives
        const GTT_Arbitrum_Eth_Derivatives = BridgeV2Tokens.areDerivatives(GTT_Arbitrum, GTT_Eth);
        assert.ok(GTT_Arbitrum_Eth_Derivatives, "GTT_Arbitrum and GTT_Eth are not derivatives");
        
        Promise.resolve();
    }, 120_000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
