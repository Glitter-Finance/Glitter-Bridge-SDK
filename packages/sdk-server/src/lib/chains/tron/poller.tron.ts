import { BridgeNetworks, BridgeType, PartialBridgeTxn, Sleep } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { Cursor, CursorFilter, NewCursor, UpdateCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "../../common/serverErrors";
import axios, { AxiosResponse } from 'axios';
import * as util from 'util';
import { TronCircleParser } from "./poller.tron.circle";

export class GlitterTronPoller implements GlitterPoller {
   
    //Network
    public network: BridgeNetworks = BridgeNetworks.TRON;
    
    //Cursors
    public cursors: Record<BridgeType, Cursor[]> ;
    public get tokenV1Cursor(): Cursor | undefined{
        return this.cursors?.[BridgeType.TokenV1]?.[0];
    }
    public get tokenV2Cursor(): Cursor | undefined{
        return this.cursors?.[BridgeType.TokenV2]?.[0];
    }
    public get usdcCursors(): Cursor[] | undefined{
        return this.cursors?.[BridgeType.Circle];
    }

    constructor() {
        this.cursors = {
            [BridgeType.TokenV1]: [],
            [BridgeType.TokenV2]: [],
            [BridgeType.Circle]: [],
            [BridgeType.Unknown]: []
        };
    }
    
    //Initialize
    initialize(sdkServer: GlitterSDKServer): void {

        //Add USDC Cursors
        const usdcAddresses = [
            sdkServer.sdk?.tron?.getTronAddress("depositWallet"),
            sdkServer.sdk?.tron?.getTronAddress("releaseWallet"),
        ];      

        usdcAddresses.forEach((address) => {
            if (address)
                this.cursors[BridgeType.Circle]?.push(
                    NewCursor(BridgeNetworks.TRON, BridgeType.Circle, address, sdkServer.defaultLimit)
                );
        });
    }

    //Poll
    async poll(sdkServer: GlitterSDKServer, cursor: Cursor): Promise<PollerResult> {

        const lastTimestamp_ms: number = cursor.batch?.lastTimestamp_ms || cursor.end?.lastTimestamp_ms || 0;

        //Poll for new txns
        const address = cursor.address;
        let response: AxiosResponse<any, any> |undefined= undefined;
        let attempts = 0;
        do {
            try {
                response = await axios.get(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`, {
                    params: {
                        limit: cursor.limit,
                        order_by: 'timestamp,asc',
                        min_timestamp: lastTimestamp_ms,
                    }
                });
                break;
            } catch (e: any) {
                attempts++;
                console.log(`Error getting signatures for address: ${e.message}`);
                console.log(`Retrying ${attempts} of 5`);
                await Sleep(250);
            }
        } while (attempts < 5);
        if (attempts >= 5) throw new Error(`Error getting signatures for address: ${address}`);
        if (!response) throw new Error(`Error getting signatures for address: ${address}`);

        const results = response.data.data;

        // Get New Txns
        let newLastTimestamp_ms = lastTimestamp_ms;
        const newTxns:string[] = [];
        for (let index = 0; index < results.length; index++) {
            const txn = results[index];
            const txID = txn.transaction_id;
            const timestamp = txn.block_timestamp;

            //Check if new
            if (timestamp > newLastTimestamp_ms) newLastTimestamp_ms = timestamp;

            //push to list
            newTxns.push(txID);
        }

        console.log(util.inspect(newTxns, false, null, true /* enable colors */));

        //Get partial transactions
        const partialTxns: PartialBridgeTxn[] = [];
        for (const txn of newTxns) {
            try {            
                //Ensure Transaction Exists
                if (!txn) continue;

                //Process Transaction
                let partialTxn: PartialBridgeTxn | undefined;
                switch (cursor.bridgeType) {
                    //case BridgeType.TokenV1:
                    //partialTxn = await SolanaV1Parser.process(sdkServer, txn);
                    //break;
                    //case BridgeType.TokenV2:
                    //partialTxn = await SolanaV2Parser.process(sdkServer, client, txn);
                    //break;
                    case BridgeType.Circle:
                        partialTxn = await TronCircleParser.process(
                            sdkServer,
                            txn,
                            sdkServer.sdk?.tron,
                            cursor
                        );
                        break;
                    default:
                        throw ServerError.InvalidBridgeType(
                            BridgeNetworks.solana,
                            cursor.bridgeType
                        );
                }
                if (CursorFilter(cursor, partialTxn)) partialTxns.push(partialTxn);
            } catch (error) {
                console.error((error as Error).message)
            }
        }

        //update cursor
        cursor = await UpdateCursor(cursor, newTxns);
        
        return {
            cursor: cursor,
            txns: partialTxns
        };

        // //get indexer
        // const indexer = sdkServer.sdk?.tron?.clientIndexer;
        // const client = sdkServer.sdk?.algorand?.client;

        // if (!indexer) { throw ServerError.ClientNotSet(BridgeNetworks.algorand) ;}
        // if (!client) { throw ServerError.ClientNotSet(BridgeNetworks.algorand); }

        // //Get transactions
        // const caller = indexer
        //     .searchForTransactions()

        // if (cursor.batch?.nextAPIToken) caller.nextToken(cursor.batch?.nextAPIToken);
        // if (cursor.limit) caller.limit(cursor.limit);
        // if (cursor.beginning?.block) caller.minRound(Number(cursor.beginning.block));

        // //Check appid or address
        // if (typeof cursor.address === "number") {
        //     caller.applicationID(cursor.address);
        // } else if (typeof cursor.address === "string") {
        //     caller.address(cursor.address);
        // }

        // //Get response
        // const response = await caller.do();

        // //Set next token
        // const nextToken = response['next-token'];

        // //Map Signatures
        // const signatures: string[] = [];
        // if (response && response.transactions) {
        //     signatures.push(...response.transactions.map((txn:any) => txn.id));
        // }

        // //Get partial transactions
        // const partialTxns: PartialBridgeTxn[] = [];
        // for (const txnID of signatures) {
        //     try {
        //         //Ensure Transaction Exists
        //         if (!txnID) continue;

        //Check if transaction was previously processed
        //if (cursor.batch?.txns?.has(txnID)) continue;
        //if (cursor.lastBatchTxns?.has(txnID)) continue;
    
        //         //Process Transaction
        //         let partialTxn: PartialBridgeTxn | undefined;
        //         switch (cursor.bridgeType) {
        //             case BridgeType.TokenV1:
        //                 partialTxn = await AlgorandTokenV1Parser.process(sdkServer, txnID, client, indexer);
        //                 break;
        //             case BridgeType.TokenV2:
        //                 partialTxn = await AlgorandTokenV2Parser.process(sdkServer, txnID, client, indexer, cursor);
        //                 break;
        //             case BridgeType.USDC:
        //                 partialTxn = await AlgorandUSDCParser.process(sdkServer, txnID, client, indexer, cursor);
        //                 break;
        //             default:
        //                 throw ServerError.InvalidBridgeType(
        //                     BridgeNetworks.algorand,
        //                     cursor.bridgeType
        //                 );
        //         }
        //         if (CursorFilter(cursor, partialTxn)) partialTxns.push(partialTxn);                
        //     } catch (error) {
        //         console.error((error as Error).message)
        //     }
        // }

        // //update cursor
        // cursor = await UpdateCursor(cursor, signatures, undefined, nextToken);

        // //Return Result
        // return {
        //     cursor: cursor,
        //     txns: partialTxns,
        // };
    }
}
