import { BridgeType, PartialBridgeTxn } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor } from "./cursor";

export interface GlitterPoller {

    //Cursors
    cursors: Record<BridgeType, Cursor[]>;
        
    //get cursors
    get tokenV1Cursor(): Cursor | undefined;
    get tokenV2Cursor(): Cursor | undefined;
    get usdcCursors(): Cursor[] | undefined;

    //Initialize
    initialize(sdkServer: GlitterSDKServer, tokenV2Address?: string): void;

    //Poll
    poll(sdkServer: GlitterSDKServer, cursor: Cursor): Promise<PollerResult>;

}

export type PollerResult = {
    cursor: Cursor;
    txns: PartialBridgeTxn[];
};

// export async function pollAllDefault(sdkServer: GlitterSDKServer, poller:GlitterPoller): Promise<PollerResult[]>{

//     //Ensure Poller is Initialized
//     if (!sdkServer.poller)
//         throw new Error("Poller not initialized");

//     //Poll All Cursors
//     const promises: Promise<PollerResult>[] = [];
//     if (poller.tokenV1Cursor) promises.push(poller.poll(sdkServer, poller.tokenV1Cursor));
//     if (poller.tokenV2Cursor) promises.push(poller.poll(sdkServer, poller.tokenV2Cursor));
//     if (poller.usdcCursors) poller.usdcCursors.forEach((cursor) => promises.push(poller.poll(sdkServer, cursor)));

//     //Return
//     const results = await Promise.all(promises);

//     //Update Cursors
//     if (poller.tokenV1Cursor) poller.tokenV1Cursor = results.find((result) => result.cursor.bridgeType === poller.tokenV1Cursor?.bridgeType)?.cursor;
//     if (poller.tokenV2Cursor) poller.tokenV2Cursor = results.find((result) => result.cursor.bridgeType === poller.tokenV2Cursor?.bridgeType)?.cursor;

//     if (poller.usdcCursors){
//         const newUSDCcursors: Cursor[] = [];
//         poller.usdcCursors.forEach((cursor) => {
//             const local_result = results.find((result) => result.cursor.bridgeType === cursor.bridgeType && result.cursor.address === cursor.address);
//             if (local_result) newUSDCcursors.push(local_result.cursor);        
//         });

//         if (newUSDCcursors.length != poller.usdcCursors.length)
//             throw new Error("USDC Cursors not updated correctly");
            
//         poller.usdcCursors = newUSDCcursors;
//     }

//     return results
// }