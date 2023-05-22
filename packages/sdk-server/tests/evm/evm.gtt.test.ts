import { BridgeNetworks, ChainStatus, GlitterEnvironment, TransactionType } from "@glitter-finance/sdk-core";
import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/lib/glitterSDKServer";
import * as util from "util";
import * as assert from "assert";
import { Cursor } from "../../src/lib/common/cursor";

import ethereumDeposits from './results/evm.gtt.deposits.json'

//const oldestTxn = "0x32a0294ba8c8f11af87f02cd7388b1de100edfefad70da6514bae984401273bb";

describe("Eth Poller USDC Tests ", () => {
    
    it("Ethereum GTT Deposits", async () => {

        //Initialize SDK
        const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Ethereum]);

        //local references for ease of use
        const poller = sdk.poller(BridgeNetworks.Ethereum);
        if (!poller) throw Error("Poller is undefined");      

        //Expected
        const expected = JSON.stringify(ethereumDeposits);

        await common(sdk, poller, TransactionType.Deposit, expected, 8961658, 7);
 
        Promise.resolve();
    }, 240_000);
    
    async function common(sdk: GlitterSDKServer, poller: GlitterPoller, txnType: TransactionType, expected: string, oldestBlock: number, limit = 20){

        //Ensure Poller & Cursor is defined
        if (!poller) throw Error("Poller is undefined");
        const localCursor = { ...poller.tokenV2Cursor } as Cursor;
        assert.ok(localCursor != undefined, "Cursor is undefined");

        //Set limit
        localCursor.limit = limit;
        localCursor.end = {
            block: oldestBlock,
        }
        localCursor.filter = {
            txnType: txnType,
            chainStatus: ChainStatus.Completed,
        }
            
        //Get Results
        const result = await poller.poll(sdk, localCursor);

        //console.log(util.inspect(result, false, null, true /* enable colors */));
        //console.log(JSON.stringify(result, null, 2));

        //Grab all Txn IDs
        const stringify = JSON.stringify(result);

        assert.ok(stringify === expected, `Result ${stringify} does not match ${expected}`);         

        console.log("Test Completed Successfully with " + result.txns.length + " results");
        
    }

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
