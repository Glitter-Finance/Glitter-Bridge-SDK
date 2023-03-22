import { BridgeNetworks, BridgeType } from "glitter-sdk-core/dist";

export type Cursor = {
    //What to watch
    network: BridgeNetworks;
    bridgeType: BridgeType;
    address: string | number;

    //Bounds
    beginning?: CursorPosition;
    end?: CursorPosition;
    limit?: number;

    //Batching
    batch?: CursorBatch;
    lastBatchTxns?: number;

    nextAPIToken?: string;
};
export type CursorPosition = {
    txn?: string;
    block?: string | number;
    time?: string;
};
export type CursorBatch = {
    position?: string | number;
    block?: string | number;
    txns: number;
    complete: boolean;
};

export function NewCursor(network: BridgeNetworks, bridgeType: BridgeType, address: string, limit: number): Cursor {
    return {
        network: network,
        bridgeType: bridgeType,
        address: address,
        beginning: undefined,
        end: undefined,
        limit: limit,
        nextAPIToken: undefined,
        batch: undefined,
    };
}
// export function CursorValid(cursor: Cursor): boolean {
//     if (!cursor) return false;
//     if (!cursor.address) return false;
//     if (!cursor.limit) return false;
//     if (cursor.limit <= 0) return false;
//     return true;
// }

export function CompleteBatch(cursor: Cursor): Cursor {
    //Set end transaction
    cursor.end = {
        txn: cursor.beginning?.txn,
        block: cursor.beginning?.block,
        time: cursor.beginning?.time,
    };

    //Reset beginning
    cursor.beginning = undefined;

    //Reset batch
    cursor.lastBatchTxns = cursor.batch?.txns;
    cursor.batch = undefined;

    //Return cursor
    return cursor;
}
