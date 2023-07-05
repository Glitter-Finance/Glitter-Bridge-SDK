import { BridgeNetworks, BridgeType, ChainStatus, PartialBridgeTxn, TransactionType } from "@glitter-finance/sdk-core";

/**
 * Represents a cursor object used for querying data.
 *
 * @typedef {Object} Cursor
 * @property {BridgeNetworks} network - The network to watch.
 * @property {BridgeType} bridgeType - The bridge type to watch.
 * @property {string | number} address - The address to watch.
 * @property {CursorPosition} [beginning] - The beginning cursor position (optional).
 * @property {CursorPosition} [end] - The end cursor position (optional).
 * @property {number} [limit] - The maximum number of results to return (optional).
 * @property {CursorFilter} [filter] - The filter for querying specific data (optional).
 * @property {CursorBatch} [batch] - The batch configuration for data retrieval (optional).
 * @property {Set<string>} [lastBatchTxns] - The set of last batch transaction IDs (optional).
 */
export type Cursor = {
    //What to watch
    network: BridgeNetworks;
    bridgeType: BridgeType;
    address: string | number;

    //Bounds
    beginning?: CursorPosition;
    end?: CursorPosition;
    limit?: number;

    //Filter
    filter?: CursorFilter;

    //Batching
    batch?: CursorBatch;
    lastBatchTxns?: Set<string>;

};

/**
 * Represents the cursor position.
 * @typedef {Object} CursorPosition
 * @property {string} [txn] - The transaction identifier.
 * @property {string|number} [block] - The block identifier.
 * @property {string} [time] - The timestamp.
 * @property {number} [lastTimestamp_ms] - The last timestamp in milliseconds.
 */
export type CursorPosition = {
    txn?: string;
    block?: string | number;
    time?: string;
    lastTimestamp_ms?: number;
};

/**
 * Represents a cursor batch.
 * @typedef {Object} CursorBatch
 * @property {string|number} [position] - The position identifier.
 * @property {string|number} [block] - The block identifier.
 * @property {number} [lastTimestamp_ms] - The last timestamp in milliseconds.
 * @property {Set<string>} txns - The set of transaction identifiers.
 * @property {boolean} complete - Indicates if the batch is complete.
 * @property {string} [nextAPIToken] - The next API token.
 */
export type CursorBatch = {
    position?: string | number;
    block?: string | number;
    lastTimestamp_ms?: number;
    txns: Set<string>;
    complete: boolean;    
    nextAPIToken?: string;
};

/**
 * Represents a cursor filter.
 * @typedef {Object} CursorFilter
 * @property {TransactionType} [txnType] - The transaction type.
 * @property {ChainStatus} [chainStatus] - The chain status.
 */
export type CursorFilter = {
    txnType?: TransactionType;
    chainStatus?: ChainStatus;
}

/**
 * Creates a new cursor.
 * @param {BridgeNetworks} network - The bridge network.
 * @param {BridgeType} bridgeType - The bridge type.
 * @param {string|number} address - The address.
 * @param {number} limit - The limit.
 * @returns {Cursor} The new cursor.
 */
export function NewCursor(network: BridgeNetworks, bridgeType: BridgeType, address: string|number, limit: number): Cursor {
    return {
        network: network,
        bridgeType: bridgeType,
        address: address,
        beginning: undefined,
        end: undefined,
        limit: limit,
        batch: undefined,    
    };
}

/**
 * Completes a batch in the cursor.
 * @param {Cursor} cursor - The cursor.
 * @param {number} [maxBlock] - The maximum block number.
 * @param {number} [lastTimestamp_ms] - The last timestamp in milliseconds.
 * @returns {Cursor} The updated cursor.
 */
export function CompleteBatch(
    cursor: Cursor, 
    maxBlock?:number,
    lastTimestamp_ms?: number): Cursor {
    //Set end transaction
    cursor.end = {
        txn: cursor.beginning?.txn,
        block: cursor.beginning?.block,
        time: cursor.beginning?.time,
        lastTimestamp_ms: cursor.beginning?.lastTimestamp_ms,
    };
    if (maxBlock && maxBlock > 0) cursor.end.block = maxBlock;
    if (lastTimestamp_ms && lastTimestamp_ms > 0) cursor.end.lastTimestamp_ms = lastTimestamp_ms;

    //Reset beginning
    cursor.beginning = undefined;

    //Reset batch
    cursor.lastBatchTxns = cursor.batch?.txns;
    cursor.batch = undefined;

    //Return cursor
    return cursor;
}

/**
 * Filters the cursor based on the transaction.
 * @param {Cursor} cursor - The cursor.
 * @param {PartialBridgeTxn} txn - The partial bridge transaction.
 * @returns {PartialBridgeTxn|undefined} The filtered transaction or undefined if not found.
 */
export function CursorFilter(cursor: Cursor, txn:PartialBridgeTxn): PartialBridgeTxn|undefined {
    if (!cursor.filter) return txn;
    if (cursor.filter.txnType && cursor.filter.txnType != txn.txnType) return undefined;
    if (cursor.filter.chainStatus && cursor.filter.chainStatus != txn.chainStatus) return undefined;
    return txn;
}

//Update Cursor
/**
 * Updates the cursor with new transaction IDs and optional parameters.
 * @param {Cursor} cursor - The cursor to update.
 * @param {string[]} txnIDs - The array of transaction IDs to add.
 * @param {number} [maxBlock] - The maximum block number.
 * @param {string} [nextAPIToken] - The next API token.
 * @param {number} [lastTimestamp_ms] - The last timestamp in milliseconds.
 * @returns {Promise<Cursor>} A promise that resolves to the updated cursor.
 */
export async function UpdateCursor(
    cursor: Cursor,
    txnIDs: string[],
    maxBlock?: number,
    nextAPIToken?: string,
    lastTimestamp_ms?: number
): Promise<Cursor> {

    //Check if we have maxxed out the limit
    if (txnIDs && txnIDs.length == cursor.limit) {

        //Check if Batch Exists
        if (!cursor.batch) {

            //Need to create new batch
            cursor.batch = {
                txns: new Set<string>(txnIDs),
                position: txnIDs[txnIDs.length - 1],
                complete: false,
                block: maxBlock,
                lastTimestamp_ms: lastTimestamp_ms,
                nextAPIToken: nextAPIToken,
            };

            //Need to set start position for when batch is complete
            cursor.beginning = {
                txn: txnIDs[0],
            };

        } else {

            //Update Batch
            txnIDs.forEach(txnID => cursor.batch?.txns.add(txnID));
            cursor.batch.position = txnIDs[txnIDs.length - 1];

            if (maxBlock) cursor.batch.block = maxBlock;
            if (nextAPIToken) cursor.batch.nextAPIToken = nextAPIToken;
            if (lastTimestamp_ms) cursor.batch.lastTimestamp_ms = lastTimestamp_ms;

        }
    } else if (!txnIDs || txnIDs.length == 0) {

        //No more transactions to fetch
        if (cursor.batch) {
            cursor = CompleteBatch(cursor, maxBlock, lastTimestamp_ms);
        } else {
            //No change to cursor
        }

    } else {

        //We have less than the limit
        if (cursor.batch) {
            txnIDs.forEach(txnID => cursor.batch?.txns.add(txnID));
            cursor = CompleteBatch(cursor, maxBlock, lastTimestamp_ms);
        } else {

            //Need to update the end position
            cursor.end = {
                txn: txnIDs[txnIDs.length - 1],
                block: cursor.beginning?.block,
                time: cursor.beginning?.time,
            };
            if (maxBlock && maxBlock > 0) cursor.end.block = maxBlock;
            if (lastTimestamp_ms && lastTimestamp_ms > 0) cursor.end.lastTimestamp_ms = lastTimestamp_ms;

            //Reset beginning
            cursor.beginning = undefined;
            cursor.lastBatchTxns = new Set<string>(txnIDs);

        }

    }

    return cursor;
}

/**
 * Converts a cursor to its string representation.
 * @param {Cursor} cursor - The cursor to convert.
 * @returns {string} The string representation of the cursor.
 */
export function CursorToString (cursor: Cursor): string {
    const jsonString = JSON.stringify(cursor, (key, value) => {
        if (value instanceof Set) {
            return Array.from(value);
        }
        return value;
    });

    return jsonString;
}

/**
 * Converts a string representation to a cursor object.
 * @param {string} string - The string representation of the cursor.
 * @returns {Cursor} The cursor object.
 */
export function CursorFromString(string:string):Cursor{
    const cursor = JSON.parse(string, (key, value) => {
        if (value instanceof Array) {
            return new Set(value);
        }
        return value;
    });
    return cursor;
}