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
    SolanaPublicNetworks,
} from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor, NewCursor, CompleteBatch, CursorFilter, UpdateCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "../../common/serverErrors";
import { SolanaV1Parser } from "./poller.solana.token.v1";
import { SolanaUSDCParser } from "./Poller.solana.usdc";
import { SolanaV2Parser } from "./poller.solana.token.v2";

export class GlitterSolanaPoller implements GlitterPoller {
    //Cursors
    public tokenV1Cursor: Cursor | undefined;
    public tokenV2Cursor: Cursor | undefined;
    public usdcCursors: Cursor[] | undefined;

    //Initialize
    public initialize(sdkServer: GlitterSDKServer): void {
    //Add Token Cursor
        const tokenAddress = sdkServer.sdk?.solana?.tokenBridgePollerAddress?.toString();
        if (tokenAddress)
            this.tokenV1Cursor = NewCursor(
                BridgeNetworks.solana,
                BridgeType.TokenV1,
                tokenAddress,
                sdkServer.defaultLimit
            );

        //Add Token V2 Cursor
        const tokenV2Address = sdkServer.sdk?.solana?.tokenBridgeV2Address?.toString();
        if (tokenV2Address)
            this.tokenV2Cursor = NewCursor(
                BridgeNetworks.solana,
                BridgeType.TokenV2,
                tokenV2Address,
                sdkServer.defaultLimit
            );

        //Add USDC Cursors
        const usdcAddresses = [
            sdkServer.sdk?.solana?.usdcBridgeDepositAddress?.toString(),
            sdkServer.sdk?.solana?.usdcBridgeDepositTokenAddress?.toString(),
            sdkServer.sdk?.solana?.usdcBridgeReceiverAddress?.toString(),
            sdkServer.sdk?.solana?.usdcBridgeReceiverTokenAddress?.toString(),
        ];
        this.usdcCursors = [];
        usdcAddresses.forEach((address) => {
            if (address)
                this.usdcCursors?.push(
                    NewCursor(
                        BridgeNetworks.solana,
                        BridgeType.USDC,
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
            if (cursor.bridgeType === BridgeType.USDC || cursor.bridgeType === BridgeType.TokenV2) {
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
                await sdkServer.sdk.solana?.Reconnect();
            }
        } while (attempts < 5);

        //Map Signatures
        const signatures: string[] = [];
        signatures.push(...newTxns.map((txn) => txn.signature));

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
                await sdkServer.sdk.solana?.Reconnect();
            }
        } while (attempts < 5);

        //Get partial transactions
        const partialTxns: PartialBridgeTxn[] = [];
        for (const txn of txnData) {
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
                case BridgeType.USDC:
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
