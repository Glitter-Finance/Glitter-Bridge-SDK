import { BridgeNetworks, BridgeTokens, BridgeV2Tokens, ChainStatus, GlitterEnvironment, Sleep, TransactionType } from "@glitter-finance/sdk-core";
import { GlitterSolanaPoller } from "../../src/lib/chains/solana/poller.solana";
import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/lib/glitterSDKServer";
import * as util from "util";
import { config } from "dotenv";
import path from "path";
import * as assert from "assert";
//import { done } from 'jest';

describe("Eth Poller USDC Tests ", () => {

    //Initialize SDK
    let sdk: GlitterSDKServer;
    let poller: GlitterPoller | undefined;

    //Before All tests -> create new SDK
    beforeAll(async () => {

        //Initialize SDK
        sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Ethereum]);

        //local references for ease of use
        poller = sdk.poller(BridgeNetworks.Ethereum);

    });

    //Default USDC Test
    it("Default USDC Cursor Test", async () => {

        //Ensure Poller & Cursor is defined
        if (!poller) throw Error("Poller is undefined");
        const cursor = poller.usdcCursors;
        assert(cursor != undefined, "Cursor is undefined");
       
        //Get first 5 transactions
        for await (const localCursor of cursor) {

            //Set limit to 5
            localCursor.limit = 5;
            
            //Get Results
            const result = await poller.poll(sdk, localCursor);

            //Grab all Txn IDs
            const txnIds = result.txns.map((txn) => txn.txnID);
            assert(txnIds.length == 5, "Txn IDs are not 5")

            //expected txns
            const expected = [
                "0xc55c2d7e2335f6e9b6ff1da88833d29d45a151ca72a8818af0b1ac6a886d23bc",
                "0x3316564697a4e7595aad617c39365ba07624a87545f92869d7a8e883cd3e36bb",
                "0x2a651922176385dc6f71677bb38c40b1c650b7b7ef21c1ffd4ae3ba55e264eed",
                "0xe55a17a0b3ed0b89573ace82b99ba3b0a6cf41338ffd52e084c282fee84d24f5",
                "0x80fb80129eb337fb85b422614e4b3095c3bf8f9a428c0f46427193c95a28d27c"
            ];

            //Check if all expected txns are present
            assert(txnIds.every((val, index) => val === expected[index]), `Txn ${txnIds} does not match ${expected}`);             

            //Check if next cursor is defined
            assert(result.cursor != undefined, "Next Cursor is undefined");

            //Check value of next cursor
            assert(result.cursor.batch != undefined, "Batch is undefined");
            assert(result.cursor.batch.txns ==5, "Batch txns is not 5");
            assert(result.cursor.batch.block ==8338092, "Batch txns is not 8338092");
            assert(!result.cursor.batch.complete, "Batch is incorrectly marked as complete");
            assert(result.cursor.batch.position == "0x80fb80129eb337fb85b422614e4b3095c3bf8f9a428c0f46427193c95a28d27c", "Batch position is not 0x80fb80129eb337fb85b422614e4b3095c3bf8f9a428c0f46427193c95a28d27c");
        }

        Promise.resolve();
    }, 30000);

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
