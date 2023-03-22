import { setupNoCursor, SOLANA_CACHED_TXIDS, testPollOnce } from "../tests_archive/solana.tests.common";
import * as util from "util";
import { GlitterSDKServer } from "@glitter-finance/sdk-server/dist";
import { BridgeNetworks, GlitterEnvironment, Sleep, Shorten, PartialBridgeTxn } from "@glitter-finance/sdk-core";
import assert from "assert";
import { Cursor } from "../../../server/src/lib/common/cursor";
const yargs = require("yargs");
import {} from "@solana/web3.js";

//Demo Parameters
let SPEED = 0.85;
let logLine = (message?: string) => {
    console.log("------------------------------------------------------------------");
    if (message) {
        console.log(message);
    } else {
        console.log();
    }
};

//Demo options
const argv = yargs
    .option("speed", {
        alias: "s",
        description: "Speed of demo.  1 = normal speed, 0.5 = half speed, 2 = double speed",
        type: "number",
    })
    .help().argv;
SPEED = argv.speed || SPEED;

main();

async function main() {
    //Initialize SDK
    let sdk = new GlitterSDKServer(GlitterEnvironment.mainnet);

    //Create Solana Poller
    sdk.createPollers([BridgeNetworks.solana]);

    //local references for ease of use
    let poller = sdk.poller(BridgeNetworks.solana);

    //Get cursor
    let cursor = poller?.tokenV1Cursor;
    if (!cursor) {
        console.error("No cursor found");
        return;
    }

    //Prep Full Txn List
    let fullTxnList: PartialBridgeTxn[] = [];
    let batchList: PartialBridgeTxn[] = [];

    //================================================================================================
    //Batch 1: =======================================================================================

    //Dialog
    logLine("Setting up cursor");
    await Sleep(500 / SPEED);
    console.log("For this example, we'll set the 'current block' to some known point in the past");
    await Sleep(2500 / SPEED);
    console.log("");
    console.log("We will match against a pre-cached list of TxnIDs on the Glitter Bridge");
    await Sleep(2500 / SPEED);
    console.log("");
    console.log("This list has 31 elements, arranged newest to oldest.");
    await Sleep(2500 / SPEED);
    console.log("");
    console.log(
        "While in realtime, we don't know what the current Txn is, for this example that's set in the past," +
            " we will assume that the current time is just before the 25th txn in the cached list : " +
            SOLANA_CACHED_TXIDS[0]
    );
    await Sleep(6500 / SPEED);
    console.log("");
    console.log("The last cached TxnID is: " + SOLANA_CACHED_TXIDS[SOLANA_CACHED_TXIDS.length - 1]);
    await Sleep(2500 / SPEED);

    //Set Beginning Cursor.  Note for realtime polling, this is not required.
    //This is only required if a cursor is not able to retrieve all the new transactions in one poll.
    //If a cursor is able to retrieve all the new transactions in one poll, then the cursor will be marked as completed.
    //Otherwise the cursor will pick up where it left off in the next poll.
    cursor.beginning = {
        txn: SOLANA_CACHED_TXIDS[25],
    };

    //Set Ending Cursor.  This is the last txn that we know about.  For this example, we'll set it to the last txn in the cached list.
    cursor.end = {
        txn: SOLANA_CACHED_TXIDS[SOLANA_CACHED_TXIDS.length - 1],
    };

    //Print cursor
    logLine("This is the starting Cursor");
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(8000 / SPEED);

    //Poll 1: ---------------------------------------------------------------------------------------
    logLine("Now Running Poll:");
    let result = await poller?.poll(sdk, cursor);
    let resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 5,
        "Expected 5 transactions.  Received " + resultTxns?.length + " transactions"
    );

    //Check Txn Results
    logLine("These are the results:");
    await Sleep(1000 / SPEED);
    await CheckResults(resultTxns, cursor, 6, 1);
    AddToBatchList(batchList, resultTxns);

    //Print new cursor
    logLine("This is the new Cursor");
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Dialog
    logLine("Since we received the max transactions, the cursor entered batching mode.");
    await Sleep(2500 / SPEED);
    console.log("");
    console.log("When we poll again, we should get the next 5 transactions within the original bounds");
    await Sleep(2500 / SPEED);
    console.log("");
    console.log("If there are no extra transactions, then we will exit batching mode and the cursor will reset.");
    await Sleep(3000 / SPEED);
    console.log("");

    //Poll 2: ---------------------------------------------------------------------------------------
    logLine("Running Second Poll:");
    result = await poller?.poll(sdk, cursor);
    resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 0,
        "Expected 0 transactions.  Received " + resultTxns?.length + " transactions"
    );
    console.log("resultTxns.length: " + resultTxns.length);

    logLine(
        "Since only 5 transactions existed in the original bounds, as expected, 0 new transactions were found here."
    );
    await Sleep(3000 / SPEED);
    console.log("");
    console.log("The cursor has exited batching mode and has reset.");
    await Sleep(2500 / SPEED);

    //Clean up batch
    fullTxnList = UpdateFullList(fullTxnList, batchList);
    batchList = [];

    //================================================================================================
    //Batch 2: =======================================================================================

    //Print new cursor
    logLine("This is the new Cursor.  Note that the end transaction is updated to reflect the new results.");
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Dialog
    logLine(
        "If we were to poll again now, we would start polling from the live block, since the beginning bounds are undefined."
    );
    await Sleep(3000 / SPEED);
    console.log("");
    logLine("Let's continue this example by setting the beginning bounds to another known point, 18th in the list.");
    await Sleep(3000 / SPEED);
    console.log("");

    //Set new beginning cursor
    cursor.beginning = {
        txn: SOLANA_CACHED_TXIDS[18],
    };

    //Poll 3: ---------------------------------------------------------------------------------------
    logLine("Running Third Poll:");
    await Sleep(1000 / SPEED);
    result = await poller?.poll(sdk, cursor);
    resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 5,
        "Expected 5 transactions.  Received " + resultTxns?.length + " transactions"
    );
    console.log("resultTxns.length: " + resultTxns.length);

    //check results
    await CheckResults(resultTxns, cursor, 13);
    AddToBatchList(batchList, resultTxns);

    //Print new cursor
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Poll 4: ---------------------------------------------------------------------------------------
    logLine("Running Fourth Poll:");
    await Sleep(1000 / SPEED);
    console.log("We need to sleep here to prevent rate limiting.  This is not required with a paid RPC.");
    await Sleep(5000); //Needed to prevent rate limiting
    result = await poller?.poll(sdk, cursor);
    resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 2,
        "Expected 2 transactions.  Received " + resultTxns?.length + " transactions"
    );
    console.log("resultTxns.length: " + resultTxns.length);

    //check results
    await CheckResults(resultTxns, cursor, 13);
    AddToBatchList(batchList, resultTxns);

    //Print new cursor
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Final Dialog
    logLine("As you can see, the cursor has run through two batches, 5 and 2, and then reset.");
    await Sleep(3000 / SPEED);
    console.log("");

    //Clean up batch
    fullTxnList = UpdateFullList(fullTxnList, batchList);
    batchList = [];

    //================================================================================================
    //Batch 3: =======================================================================================

    logLine("Let's finish this example by setting the poller to the first txn in the list");
    await Sleep(3000 / SPEED);

    //Set new beginning cursor
    cursor.beginning = {
        txn: SOLANA_CACHED_TXIDS[0],
    };

    //Poll 5: ---------------------------------------------------------------------------------------
    logLine("Running Fifth Poll:");
    await Sleep(1000 / SPEED);
    console.log("We need to sleep here to prevent rate limiting.  This is not required with a paid RPC.");
    await Sleep(5000); //Needed to prevent rate limiting

    result = await poller?.poll(sdk, cursor);
    resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 5,
        "Expected 5 transactions.  Received " + resultTxns?.length + " transactions"
    );
    console.log("resultTxns.length: " + resultTxns.length);

    //check results
    await CheckResults(resultTxns, cursor, 31);
    AddToBatchList(batchList, resultTxns);

    //Print new cursor
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Poll 6: ---------------------------------------------------------------------------------------
    logLine("Running Sixth Poll:");
    await Sleep(1000 / SPEED);
    console.log("We need to sleep here to prevent rate limiting.  This is not required with a paid RPC.");
    await Sleep(5000); //Needed to prevent rate limiting

    result = await poller?.poll(sdk, cursor);
    resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 5,
        "Expected 5 transactions.  Received " + resultTxns?.length + " transactions"
    );
    console.log("resultTxns.length: " + resultTxns.length);

    //check results
    await CheckResults(resultTxns, cursor, 31);
    AddToBatchList(batchList, resultTxns);

    //Print new cursor
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Poll 7: ---------------------------------------------------------------------------------------
    logLine("Running Seventh Poll:");
    await Sleep(1000 / SPEED);
    console.log("We need to sleep here to prevent rate limiting.  This is not required with a paid RPC.");
    await Sleep(5000); //Needed to prevent rate limiting

    result = await poller?.poll(sdk, cursor);
    resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 5,
        "Expected 5 transactions.  Received " + resultTxns?.length + " transactions"
    );
    console.log("resultTxns.length: " + resultTxns.length);

    //check results
    await CheckResults(resultTxns, cursor, 31);
    AddToBatchList(batchList, resultTxns);

    //Print new cursor
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Poll 8: ---------------------------------------------------------------------------------------
    logLine("Running Eighth Poll:");
    await Sleep(1000 / SPEED);
    console.log("We need to sleep here to prevent rate limiting.  This is not required with a paid RPC.");
    await Sleep(5000); //Needed to prevent rate limiting

    result = await poller?.poll(sdk, cursor);
    resultTxns = result?.txns || [];
    assert(
        result && resultTxns.length == 3,
        "Expected 3 transactions.  Received " + resultTxns?.length + " transactions"
    );
    console.log("resultTxns.length: " + resultTxns.length);

    //check results
    await CheckResults(resultTxns, cursor, 31);
    AddToBatchList(batchList, resultTxns);

    //Print new cursor
    cursor = result?.cursor;
    console.log(util.inspect(cursor, false, null, true));
    await Sleep(5000 / SPEED);

    //Wrapup: ---------------------------------------------------------------------------------------
    //Clean up batch
    fullTxnList = UpdateFullList(fullTxnList, batchList);

    //Final Dialog
    let finalSignatures = fullTxnList.map((txn) => Shorten.shorten(txn.txnID, 4));
    let cachedSignatures = [];
    for (let i = 1; i < SOLANA_CACHED_TXIDS.length - 1; i++) {
        cachedSignatures.push(Shorten.shorten(SOLANA_CACHED_TXIDS[i], 4));
    }

    console.log("Here are the final signatures: ");
    console.log(util.inspect(finalSignatures, false, null, true));
    console.log("Compared to the original list: ");
    console.log(util.inspect(cachedSignatures, false, null, true));

    //End: -------------------------------------------------------------------------------------------
    process.exit(0);
}

async function CheckResults(
    resultTxns: PartialBridgeTxn[],
    cursor: Cursor,
    offset: number,
    speedMultiplier: number = 2
) {
    //Update offset
    if (cursor.batch) {
        offset += -cursor.batch.txns + (cursor.limit || 0);
    } else {
        offset += -(cursor.lastBatchTxns || 0) + resultTxns.length;
    }

    for (let i = 0; i < resultTxns.length || 0; i++) {
        let expectedTxn = Shorten.shorten(SOLANA_CACHED_TXIDS[SOLANA_CACHED_TXIDS.length - offset + i], 4);
        let actualTxn = Shorten.shorten(resultTxns[i].txnID, 4);
        let type = resultTxns[i].txnType;
        assert(expectedTxn == actualTxn, "Expected TxnID " + expectedTxn + " but received " + actualTxn);
        console.log(`Txn ${i} matches.  Expected: ${expectedTxn} | Actual: ${actualTxn} | Type: ${type}`);
        await Sleep(1000 / SPEED / speedMultiplier);
    }
}
function AddToBatchList(batchList: PartialBridgeTxn[], resultTxns: PartialBridgeTxn[]) {
    batchList.push(...resultTxns);
}
function UpdateFullList(fullList: PartialBridgeTxn[], batchList: PartialBridgeTxn[]): PartialBridgeTxn[] {
    //Insert batchlist into front of fullList
    let resultTxns: PartialBridgeTxn[] = [];
    resultTxns.push(...batchList);
    resultTxns.push(...fullList);

    return resultTxns;
}
