import { BridgeNetworks, ChainStatus, GlitterEnvironment, TransactionType } from "@glitter-finance/sdk-core/dist";
import { GlitterPoller, GlitterSDKServer } from "@glitter-finance/sdk-server";
import assert from "assert";
import * as util from "util";

main()

async function main() {
    //Initialize SDK
    const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

    //Create Solana Poller
    sdk.createPollers([BridgeNetworks.Ethereum]);

    //local references for ease of use
    const poller = sdk.poller(BridgeNetworks.Ethereum);
    if (!poller) throw Error("Poller is undefined");

    //Deposits
    let expected = [
        "0x6e1f935edad67a6d9cc0d4f5b166ef0c63d781353bab11ec25946c2bff29a9e9",
        "0x921fc2a1305ac26b19a3486612618e80613a8a5c055237a494914c9113b91429",
        "0xc1c7de44084984af9c624b706bd7e2510aa31f6cb09462e25f75950688001071",
        "0x7d6a86ec4fd3f9fe4da54cf411f8b932447d7a6de3096d006db7126d5b902bb2"
    ];

    await common(sdk, poller, TransactionType.Deposit, expected, "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e");
                
    //Releases
    expected = [
        "0x118b728d4a4fd23d8efc34bf5671292e78fe47cd9f061f279664f08f75462755",
        "0x68a2f7ceec9d598ebc4c4505e77657220ac4d835c6d791b755098d736526312c",
    ];

    await common(sdk, poller, TransactionType.Release, expected, "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e");

    //Refunds
    expected = [
        "0x5ae60b28670eedf5b31abea5d8328ddd94eef200852bbcb5a3838386360fc767",
        "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e",
    ];

    await common(sdk, poller, TransactionType.Refund, expected, "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e");
        
    Promise.resolve();
}

async function common(sdk: GlitterSDKServer, poller: GlitterPoller, txnType: TransactionType, expected: string[], endTxn: string){

    //Ensure Poller & Cursor is defined
    if (!poller) throw Error("Poller is undefined");
    const localCursor = poller.tokenV2Cursor;
    assert(localCursor != undefined, "Cursor is undefined");

    //Set limit to 20 // Token bridge needs to larger since multiple logs are emitted on some blocks
    localCursor.limit = 20;
    localCursor.filter = {
        txnType: txnType,
        chainStatus: ChainStatus.Completed,
    }
            
    //Get Results
    const result = await poller.poll(sdk, localCursor);

    console.log(util.inspect(result, false, null, true /* enable colors */));
        
    //Grab all Txn IDs
    const txnIds = result.txns.map((txn) => txn.txnID);
    assert(txnIds.length == expected.length, `Txn IDs are not ${expected.length}`)

    //Check if all expected txns are present
    assert(txnIds.every((val, index) => val === expected[index]), `Txn ${txnIds} does not match ${expected}`);             

    //Check if next cursor is defined
    assert(result.cursor != undefined, "Next Cursor is undefined");

    //Check value of next cursor
    assert(result.cursor.batch == undefined, "Batch is not undefined");
    assert(result.cursor.end?.txn == endTxn, `End txn is not ${endTxn}`);
        
}