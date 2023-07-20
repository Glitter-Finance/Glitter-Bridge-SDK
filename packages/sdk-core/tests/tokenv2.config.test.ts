import assert from "assert";
import { BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment } from "../src";
import tokenConfig from "../src/config/testnet-tokens.json";
import { BridgeV2Tokens } from "../src/lib/common/tokens/BridgeV2Tokens";

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

        const GTT_JSON = `{"asset_id":8,"asset_name":"Glitter Test Token","asset_symbol":"GTT","asset_bridge_fee":0.005,"chains":[{"chain":"Ethereum","symbol":"GTT","name":"Glitter Test Token","decimals":18,"address":"0x3aEE2ca29df1EdB741c299ca1903C5cE2DFC0F9d","min_transfer":0,"vault_type":"outgoing","vault_address":"0x7cdb52a40f703f2f8d9006e98cf408942d1a2595"},{"chain":"Arbitrum","symbol":"xGTT","name":"Wrapped Glitter Test Token","decimals":18,"address":"0x961388fe63d3134a2d83b9dba4b771f738bf8d8d","min_transfer":0,"vault_type":"incoming","vault_address":"0x961388fe63d3134a2d83b9dba4b771f738bf8d8d"},{"chain":"zkEVM","symbol":"xGTT","name":"Wrapped Glitter Test Token","decimals":18,"address":"0xb36a5accccac48e3ae3207ece4d1cdfd693dd77f","min_transfer":0,"vault_type":"incoming","vault_address":"0xb36a5accccac48e3ae3207ece4d1cdfd693dd77f"},{"chain":"Polygon","symbol":"xGTT","name":"Wrapped Glitter Test Token","decimals":18,"address":"0xfb5e89d2d9f33e7e5736a6bd40ffe3ddee3fab5d","min_transfer":0,"vault_type":"incoming","vault_address":"0xfb5e89d2d9f33e7e5736a6bd40ffe3ddee3fab5d"},{"chain":"Avalanche","symbol":"xGTT","name":"Wrapped Glitter Test Token","decimals":18,"address":"0x1aee85ab59f6f9aa79e9b1cee76926dc81ecf7bb","min_transfer":0,"vault_type":"incoming","vault_address":"0x1aee85ab59f6f9aa79e9b1cee76926dc81ecf7bb"},{"chain":"Binance","symbol":"xGTT","name":"Wrapped Glitter Test Token","decimals":18,"address":"0xf83a807849965419c5c9e36b12d5a5da03c34307","min_transfer":0,"vault_type":"incoming","vault_address":"0xf83a807849965419c5c9e36b12d5a5da03c34307"},{"chain":"Optimism","symbol":"xGTT","name":"Wrapped Glitter Test Token","decimals":18,"address":"0x4c412833bef9c911c57ec0441f7d8a2c482fd81b","min_transfer":0,"vault_type":"incoming","vault_address":"0x4c412833bef9c911c57ec0441f7d8a2c482fd81b"}]}`;
        const GTT_Eth_JSON = JSON.stringify(tokenConfig.tokens.find(x => x.asset_id == 8)?.chains[0]);
        const GTT_Arbitrum_JSON = JSON.stringify(tokenConfig.tokens.find(x => x.asset_id == 8)?.chains[1]);
        //Get GTT Token Config
        const GTT = BridgeV2Tokens.getTokenConfig("GTT");
        assert.ok(GTT != undefined, "GTT is undefined");
        assert.ok(GTT_JSON == JSON.stringify(GTT), "GTT value is unexpected");

        //Get Eth GTT Chain Token Config
        const GTT_Eth= BridgeV2Tokens.getChainConfig(BridgeNetworks.Ethereum, "GTT");
        assert.ok(GTT_Eth != undefined, "GTT_Eth is undefined");
        assert.ok(GTT_Eth_JSON == JSON.stringify(GTT_Eth), "GTT_Eth value is unexpected");
       
        //Get GTT Token Config parent from child.
        const GTT_Eth_Parent = BridgeV2Tokens.getChainConfigParent(GTT_Eth);
        assert.ok(GTT_Eth_Parent != undefined, "GTT_Eth_Parent is undefined");
        assert.ok(GTT_JSON == JSON.stringify(GTT_Eth_Parent), "GTT_Eth_Parent value is unexpected");

        //Get GTT Eth Chain Token Config Child From Parent
        const GTT_Child_Eth = BridgeV2Tokens.getTokenConfigChild(GTT_Eth_Parent, BridgeNetworks.Ethereum);
        assert.ok(GTT_Child_Eth != undefined, "GTT_Child_Eth is undefined");
        assert.ok(JSON.stringify(GTT_Eth) == JSON.stringify(GTT_Child_Eth), "GTT_Child_Eth value is unexpected");

        //Get GTT Token Config from Arbitrum xGTT
        const GTT_Arbitrum_Parent = BridgeV2Tokens.getTokenConfig(BridgeNetworks.Arbitrum, "xGTT");
        assert.ok(GTT_Arbitrum_Parent != undefined, "GTT_Arbitrum_Parent is undefined");
        assert.ok(GTT_JSON == JSON.stringify(GTT_Arbitrum_Parent), "GTT_Arbitrum_Parent value is unexpected");

        //Get xGTT Arbitrum Chain Token Config
        const GTT_Arbitrum = BridgeV2Tokens.getChainConfig(BridgeNetworks.Arbitrum, "xGTT");
        assert.ok(GTT_Arbitrum != undefined, "GTT_Arbitrum is undefined");
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
