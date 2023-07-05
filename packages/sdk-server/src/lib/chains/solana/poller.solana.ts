import {
    ConfirmedSignatureInfo,
    ParsedTransactionWithMeta,
    PublicKey,
    SignaturesForAddressOptions,
    Connection
} from "@solana/web3.js";

import {
    BridgeNetworks,
    BridgeType,
    GlitterEnvironment,
    PartialBridgeTxn,
} from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { Cursor, NewCursor, CursorFilter, UpdateCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "../../common/serverErrors";
import { SolanaV1Parser } from "./poller.solana.token.v1";
import { SolanaCircleParser } from "./Poller.solana.circle";
import { SolanaV2Parser } from "./poller.solana.token.v2";

/**
 * Glitter Solana Poller class.
 * Implements the GlitterPoller interface.
 */
export class GlitterSolanaPoller implements GlitterPoller {
    
    //Network
    public network: BridgeNetworks = BridgeNetworks.solana;
    
    //Cursors
    /**
     * Cursors object for tracking transaction cursors.
     * The keys represent BridgeTypes and the values are arrays of Cursor objects.
     *
     * @type {Record<BridgeType, Cursor[]>}
     */
    public cursors: Record<BridgeType, Cursor[]> ;
    /**
     * Get the tokenV1Cursor.
     *
     * @type {Cursor | undefined}
     * @readonly
     */
    public get tokenV1Cursor(): Cursor | undefined{
        return this.cursors?.[BridgeType.TokenV1]?.[0];
    }
    /**
     * Get the tokenV2Cursor.
     *
     * @type {Cursor | undefined}
     * @readonly
     */
    public get tokenV2Cursor(): Cursor | undefined{
        return this.cursors?.[BridgeType.TokenV2]?.[0];
    }
    /**
     * Get the usdcCursors.
     *
     * @type {Cursor | undefined}
     * @readonly
     */
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
    /**
     * Initializes the solana poller.
     *
     * @public
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @returns {void}
     */
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
    /**
     * Polls for updates using the provided cursor.
     *
     * @public
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {Cursor} cursor - The cursor for polling updates.
     * @returns {Promise<PollerResult>} A promise that resolves to the poller result.
     */
    public async poll(
        sdkServer: GlitterSDKServer,
        cursor: Cursor
    ): Promise<PollerResult> {

        //Check Client
        const client = this.getClient(sdkServer, cursor.bridgeType);
        if (!client) throw ServerError.ClientNotSet(BridgeNetworks.solana);

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

            if (!txn) continue;

            //Process Transaction
            const partialTxn = await this.parseTxnData(sdkServer, txn, cursor.bridgeType);
            if (!partialTxn) continue;

            //Run Through Filter
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

    //Parse Txn
    /**
     * Parses the transaction data and returns a partial bridge transaction based on the provided bridge type.
     *
     * @public
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {ParsedTransactionWithMeta} txnData - The parsed transaction data.
     * @param {BridgeType} type - The bridge type.
     * @returns {Promise<PartialBridgeTxn | undefined>} A promise that resolves to the partial bridge transaction, or undefined if parsing fails.
     */
    async parseTxnData(sdkServer: GlitterSDKServer, txnData:ParsedTransactionWithMeta, type:BridgeType):Promise<PartialBridgeTxn | undefined>{
        
        //Check Client
        const client = this.getClient(sdkServer, type);
        if (!client) throw ServerError.ClientNotSet(BridgeNetworks.solana);

        try {
            //Ensure Transaction Exists
            if (!txnData) return undefined;

            //Process Transaction
            switch (type) {
                case BridgeType.TokenV1:
                    return await SolanaV1Parser.process(sdkServer, txnData);
                case BridgeType.TokenV2:
                    return await SolanaV2Parser.process(sdkServer, client, txnData);
                case BridgeType.Circle:
                    return await SolanaCircleParser.process(
                        sdkServer,
                        txnData,
                        client
                    );
                default:
                    throw ServerError.InvalidBridgeType(
                        BridgeNetworks.solana,
                        type
                    );
            }
                      
        } catch (error) {
            console.error((error as Error).message)
        }

        return undefined;

    }
    /**
     * Parses the transaction ID and returns a partial bridge transaction based on the provided bridge type.
     *
     * @public
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {string} txnID - The transaction ID.
     * @param {BridgeType} type - The bridge type.
     * @returns {Promise<PartialBridgeTxn | undefined>} A promise that resolves to the partial bridge transaction, or undefined if parsing fails.
     */
    async parseTxnID(sdkServer: GlitterSDKServer, txnID:string, type:BridgeType):Promise<PartialBridgeTxn | undefined>{
        try {
            
            //Ensure Transaction Exists
            if (!txnID) return undefined;

            //Check Client
            const client = this.getClient(sdkServer, type);
            if (!client) throw ServerError.ClientNotSet(BridgeNetworks.solana);

            //Get ParsedTransactionWithMeta
            const txn = await client.getParsedTransaction(txnID, {
                maxSupportedTransactionVersion: 0,
            });
            if (!txn) return undefined;

            //Process Transaction
            switch (type) {
                case BridgeType.TokenV1:
                    return await SolanaV1Parser.process(sdkServer, txn);
                case BridgeType.TokenV2:
                    return await SolanaV2Parser.process(sdkServer, client, txn);                
                case BridgeType.Circle:
                    return await SolanaCircleParser.process(sdkServer, txn, client);
                default:
                    throw ServerError.InvalidBridgeType(
                        BridgeNetworks.solana,
                        type
                    );
            }
                      
        } catch (error) {
            console.error((error as Error).message)
        }

        return undefined;

    }

    //Get Transactions
    /**
     * Retrieves the filter options for obtaining signatures for a specific address.
     *
     * @public
     * @param {Cursor} cursor - The cursor for retrieving signatures.
     * @returns {Promise<SignaturesForAddressOptions>} A promise that resolves to the filter options for obtaining signatures.
     */
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

    /**
     * Retrieves the connection client based on the provided bridge type.
     *
     * @public
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {BridgeType} type - The bridge type.
     * @returns {Connection | undefined} The connection client for the specified bridge type, or undefined if not found.
     */
    getClient(sdkServer: GlitterSDKServer, type:BridgeType): Connection | undefined{
        //Check Client
        let client = sdkServer.sdk?.solana?.connections[sdkServer.sdk?.solana?.defaultConnection];
        if (sdkServer.sdk.environment === GlitterEnvironment.testnet) {
            if (type === BridgeType.Circle || type === BridgeType.TokenV2) {
                client = sdkServer.sdk?.solana?.connections["devnet"];
            }
        }
        if (!client) throw ServerError.ClientNotSet(BridgeNetworks.solana);

        return client;

    }
   
}
