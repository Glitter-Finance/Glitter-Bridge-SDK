import { BridgeNetworks, ChainStatus, GlitterEnvironment, TransactionType } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "@glitter-finance/sdk-server"

import * as assert from "assert";
import * as util from "util";

//Initialize SDK
const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

//Create Solana Poller
sdk.createPollers([BridgeNetworks.solana]); 
const poller = sdk.poller(BridgeNetworks.solana);

main();

async function main(){
    if (!poller) throw Error("Poller is undefined");
    const cursor = poller.tokenV2Cursor;
    assert.ok(cursor);
    
    //Cursor filter
    cursor.filter = {
        txnType: TransactionType.Deposit,
        chainStatus: ChainStatus.Completed,
    };

    const result = await poller.poll(sdk, cursor);
    console.log(util.inspect(result, false, null, true /* enable colors */));
}
