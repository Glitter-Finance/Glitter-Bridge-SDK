import {
    ConfirmedSignatureInfo,
    ParsedTransactionWithMeta,
    PublicKey,
    SignaturesForAddressOptions,
} from "@solana/web3.js";

import {
    BridgeNetworks,
    BridgeType,
    GlitterEnvironment,
    PartialBridgeTxn,
} from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor, NewCursor, CursorFilter, UpdateCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "../../common/serverErrors";
import { SolanaV1Parser } from "./poller.solana.token.v1";
import { SolanaUSDCParser } from "./Poller.solana.usdc";
import { SolanaV2Parser } from "./poller.solana.token.v2";

export class GlitterSolanaPoller implements GlitterPoller {
    
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
    public initialize(sdkServer: GlitterSDKServer): void {
    //Add Token Cursor
        const tokenAddress = sdkServer.sdk?.solana?.getAddress("bridgeProgram");
        if (tokenAddress)
            this.cursors[BridgeType.TokenV1].push(
                NewCursor(
                    BridgeNetworks.solana,
                    BridgeType.TokenV1,
                    tokenAddress,
                    sdkServer.defaultLimit
                )
            );

        //Add Token V2 Cursor
        const tokenV2Address = sdkServer.sdk?.solana?.getAddress("tokenBridgeV2Address");
        if (tokenV2Address)
            this.cursors[BridgeType.TokenV2].push(
                NewCursor(
                    BridgeNetworks.solana,
                    BridgeType.TokenV2,
                    tokenV2Address,
                    sdkServer.defaultLimit
                )
            );

        //Add USDC Cursors
        const usdcAddresses = [
            sdkServer.sdk?.solana?.getAddress("usdcReceiver"),
            sdkServer.sdk?.solana?.getAddress("usdcReceiverTokenAccount"),
            sdkServer.sdk?.solana?.getAddress("usdcDeposit"),
            sdkServer.sdk?.solana?.getAddress("usdcDepositTokenAccount"),
        ];
        usdcAddresses.forEach((address) => {
            if (address)
                this.cursors[BridgeType.Circle]?.push(
                    NewCursor(
                        BridgeNetworks.solana,
                        BridgeType.Circle,
                        address,
                        sdkServer.defaultLimit
                    )
                );
        });
    }

    //Poll   
    public async poll(
        sdkServer: GlitterSDKServer,
        cursor: Cursor
    ): Promise<PollerResult> {

        //Check Client
        let client = sdkServer.sdk?.solana?.connections[sdkServer.sdk?.solana?.defaultConnection];
        if (sdkServer.sdk.environment === GlitterEnvironment.testnet) {
            if (cursor.bridgeType === BridgeType.Circle || cursor.bridgeType === BridgeType.TokenV2) {
                client = sdkServer.sdk?.solana?.connections["devnet"];
            }
        }
        if (!client) throw ServerError.ClientNotSet(BridgeNetworks.solana);

        //Check Cursor
        if (!cursor) throw ServerError.CursorNotSet(BridgeNetworks.solana);

        //Get New Transactions
        const searchFilter = await this.getFilter(cursor);
        let attempts = 0;
        let newTxns: ConfirmedSignatureInfo[] = [];
        do {
            try {
                newTxns = await client.getSignaturesForAddress(
                    new PublicKey(cursor.address || ""),
                    searchFilter
                );
                break;
            } catch (e: any) {
                attempts++;
                console.log(`Error getting signatures for address: ${e.message}`);
                console.log(`Retrying ${attempts} of 5`);
                await sdkServer.sdk.solana?.reconnect();
            }
        } while (attempts < 5);

        //Map Signatures
        const signatures: string[] = [];

        //Check if transaction was previously processed
        for (const txn of newTxns) {
            if (cursor.batch?.txns?.has(txn.signature)) continue;
            if (cursor.lastBatchTxns?.has(txn.signature)) continue;
            signatures.push(txn.signature);
        }

        //Get Transaction Data
        let txnData: (ParsedTransactionWithMeta | null)[] = [];
        do {
            try {
                txnData = await client.getParsedTransactions(signatures, {
                    maxSupportedTransactionVersion: 0,
                });
                break;
            } catch (e: any) {
                attempts++;
                console.log(`Error getting signatures for address: ${e.message}`);
                console.log(`Retrying ${attempts} of 5`);
                await sdkServer.sdk.solana?.reconnect();
            }
        } while (attempts < 5);

        //Get partial transactions
        const partialTxns: PartialBridgeTxn[] = [];
        for (const txn of txnData) {
            try {            
                //Ensure Transaction Exists
                if (!txn) continue;

                //Process Transaction
                let partialTxn: PartialBridgeTxn | undefined;
                switch (cursor.bridgeType) {
                    case BridgeType.TokenV1:
                        partialTxn = await SolanaV1Parser.process(sdkServer, txn);
                        break;
                    case BridgeType.TokenV2:
                        partialTxn = await SolanaV2Parser.process(sdkServer, client, txn);
                        break;
                    case BridgeType.Circle:
                        partialTxn = await SolanaUSDCParser.process(
                            sdkServer,
                            txn,
                            client,
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
        cursor = await UpdateCursor(cursor, signatures);

        //Return Result
        return {
            cursor: cursor,
            txns: partialTxns,
        };
    }

    //Get Transactions
    public async getFilter(cursor: Cursor): Promise<SignaturesForAddressOptions> {
    //Set Search Filter
        const searchFilter = {
            limit: cursor.limit,
            before: cursor.beginning?.txn || undefined,
            until: cursor.end?.txn || undefined,
        };

        //Check if Batch Exists
        if (cursor.batch) {
            searchFilter.before = cursor.batch.position?.toString();
        }

        return searchFilter;
    }
   
}
