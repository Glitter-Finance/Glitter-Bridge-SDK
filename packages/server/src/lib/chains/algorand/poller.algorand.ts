import { BridgeNetworks, BridgeType, PartialBridgeTxn } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor, CursorFilter, NewCursor, UpdateCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "src/lib/common/serverErrors";
import { AlgorandUSDCParser } from "./poller.algorand.usdc";
import { AlgorandTokenV2Parser } from "./poller.algorand.token.v2";
import { AlgorandTokenV1Parser } from "./poller.algorand.token.v1";

export class GlitterAlgorandPoller implements GlitterPoller {
    //Cursors
    public tokenV1Cursor: Cursor | undefined;
    public tokenV2Cursor: Cursor | undefined;
    public usdcCursors: Cursor[] | undefined;

    //Initialize
    initialize(sdkServer: GlitterSDKServer, tokenV2Address?: string): void {
        //Add Token Cursor
        const tokenAddress = sdkServer.sdk?.algorand?.tokenBridgeAppID?.toString();
        if (tokenAddress)
            this.tokenV1Cursor = NewCursor(
                BridgeNetworks.algorand,
                BridgeType.TokenV1,
                tokenAddress,
                sdkServer.defaultLimit
            );

        //Add Token V2 Cursor
        if (tokenV2Address)
            this.tokenV2Cursor = NewCursor(
                BridgeNetworks.algorand,
                BridgeType.TokenV2,
                tokenV2Address,
                sdkServer.defaultLimit
            );

        //Add USDC Cursors
        const usdcAddresses = [
            sdkServer.sdk?.algorand?.usdcBridgeDepositAddress?.toString(),
            sdkServer.sdk?.algorand?.usdcBridgeReceiverAddress?.toString(),
        ];
        this.usdcCursors = [];
        usdcAddresses.forEach((address) => {
            if (address)
                this.usdcCursors?.push(
                    NewCursor(BridgeNetworks.algorand, BridgeType.USDC, address, sdkServer.defaultLimit)
                );
        });
    }

    //Poll
    async poll(sdkServer: GlitterSDKServer, cursor: Cursor): Promise<PollerResult> {
       
        //get indexer
        const indexer = sdkServer.sdk?.algorand?.clientIndexer;
        const client = sdkServer.sdk?.algorand?.client;

        if (!indexer) { throw ServerError.ClientNotSet(BridgeNetworks.algorand) ;}
        if (!client) { throw ServerError.ClientNotSet(BridgeNetworks.algorand); }

        //Get transactions
        const caller = indexer
            .searchForTransactions()

        if (cursor.batch?.nextAPIToken) caller.nextToken(cursor.batch?.nextAPIToken);
        if (cursor.limit) caller.limit(cursor.limit);
        if (cursor.beginning?.block) caller.minRound(Number(cursor.beginning.block));

        //Check appid or address
        if (typeof cursor.address === "number") {
            caller.applicationID(cursor.address);
        } else if (typeof cursor.address === "string") {
            caller.address(cursor.address);
        }

        //Get response
        const response = await caller.do();

        //Set next token
        const nextToken = response['next-token'];

        //Map Signatures
        const signatures: string[] = [];
        if (response && response.transactions) {
            signatures.push(...response.transactions.map((txn:any) => txn.id));
        }

        //Get partial transactions
        const partialTxns: PartialBridgeTxn[] = [];
        for (const txnID of signatures) {
            //Ensure Transaction Exists
            if (!txnID) continue;

            //Process Transaction
            let partialTxn: PartialBridgeTxn | undefined;
            switch (cursor.bridgeType) {
                case BridgeType.TokenV1:
                    partialTxn = await AlgorandTokenV1Parser.process(sdkServer, txnID, client, indexer, cursor);
                    break;
                case BridgeType.TokenV2:
                    partialTxn = await AlgorandTokenV2Parser.process(sdkServer, txnID, client, indexer, cursor);
                    break;
                case BridgeType.USDC:
                    partialTxn = await AlgorandUSDCParser.process(sdkServer, txnID, client, indexer, cursor);
                    break;
                default:
                    throw ServerError.InvalidBridgeType(
                        BridgeNetworks.solana,
                        cursor.bridgeType
                    );
            }
            if (CursorFilter(cursor, partialTxn)) partialTxns.push(partialTxn);
        }

        //update cursor
        cursor = await UpdateCursor(cursor, signatures, undefined, nextToken);

        //Return Result
        return {
            cursor: cursor,
            txns: partialTxns,
        };
    }
}
