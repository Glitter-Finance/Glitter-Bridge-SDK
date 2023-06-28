import { BridgeNetworks, BridgeType, EvmConnect, PartialBridgeTxn } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { Cursor, CursorFilter, NewCursor, UpdateCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "../../common/serverErrors";
import axios from "axios";
import { EvmV2Parser } from "./poller.evm.token.v2";
import { EvmCircleParser } from "./poller.evm.circle";

export class GlitterEVMPoller implements GlitterPoller {

    //Network
    public network: BridgeNetworks;
    
    //EVM Connect
    private apiKey: string | undefined;
    private apiURL: string | undefined;
    private connect: EvmConnect | undefined;
    
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
    //Construct class with network
    constructor(sdkServer: GlitterSDKServer, network: BridgeNetworks) {
        this.network = network;

        this.cursors = {
            [BridgeType.TokenV1]: [],
            [BridgeType.TokenV2]: [],
            [BridgeType.Circle]: [],
            [BridgeType.Unknown]: []
        };

        const apiConfig = sdkServer.API_Config(network);

        this.apiKey = apiConfig?.API_KEY;
        this.apiURL = apiConfig?.API_URL;

        //Store
        switch (network) {
            case BridgeNetworks.Ethereum:
                this.connect = sdkServer.sdk?.ethereum;
                break;
            case BridgeNetworks.Avalanche:
                this.connect = sdkServer.sdk?.avalanche;
                break;
            case BridgeNetworks.Polygon:
                this.connect = sdkServer.sdk?.polygon;
                break;
            case BridgeNetworks.Arbitrum:
                this.connect = sdkServer.sdk?.arbitrum;
                break;
            case BridgeNetworks.Binance:
                this.connect = sdkServer.sdk?.binance;
                break;
            case BridgeNetworks.Zkevm:
                this.connect = sdkServer.sdk?.zkevm;
                break;
            case BridgeNetworks.Optimism:
                this.connect = sdkServer.sdk?.optimism;
                break;
            default:
                throw new Error("Invalid Network");
        }
    }

    //Intialize Poller
    initialize(sdkServer: GlitterSDKServer): void {
        if (this.network === undefined) throw ServerError.NetworkNotSet();

        //Add Token Cursor
        const tokenAddress = undefined;
        if (tokenAddress)
            this.cursors[BridgeType.TokenV1].push(
                NewCursor(
                    this.network, 
                    BridgeType.TokenV1, 
                    tokenAddress, 
                    sdkServer.defaultLimit
                )
            );

        //Add Token V2 Cursor
        const tokenV2Address = this.connect?.getAddress("tokenBridge");       
        if (tokenV2Address)
            this.cursors[BridgeType.TokenV2].push(
                NewCursor(
                    this.network,
                    BridgeType.TokenV2,
                    tokenV2Address,
                    sdkServer.defaultLimit
                )
            );

        //Add USDC Cursors
        const usdcAddresses = [
            this.connect?.getAddress("bridge")
        ];
        usdcAddresses.forEach((address) => {
            if (this.network === undefined) throw ServerError.NetworkNotSet();
            if (address)
                this.cursors[BridgeType.Circle]?.push(NewCursor(this.network, BridgeType.Circle, address, sdkServer.defaultLimit));
        });
    }

    //Poll
    async poll(sdkServer: GlitterSDKServer, cursor: Cursor): Promise<PollerResult> {
        const address = cursor.address;
        let startBlock = cursor.end?.block;

        if (cursor.batch) startBlock = cursor.batch.block;

        //build url
        const url = this.apiURL +
            `/api?module=logs&action=getLogs&address=${address}` +
            `&fromBlock=${startBlock}&offset=${cursor.limit}` +
            `&page=1&sort=asc&apikey=` +
            this.apiKey;
        //console.log(url);

        //Request Data
        const response = await axios.get(url);
        const resultData = JSON.parse(JSON.stringify(response.data));
        const events = resultData.result;

        //Map Signatures        
        const txnHashes: string[] = events.map((event: any) => event.transactionHash);
        const signatures= new Set(txnHashes)
        const maxBlock = Math.max(...events.map((event: any) => event.blockNumber));

        //Parse Txns
        const partialTxns: PartialBridgeTxn[] = [];
        for (const txnID of signatures) {

            //Check if transaction was previously processed
            if (cursor.batch?.txns?.has(txnID)) continue;
            if (cursor.lastBatchTxns?.has(txnID)) continue;

            //Process Transaction
            const partialTxn = await this.parseTxnID(sdkServer, txnID, cursor.bridgeType);
            if (!partialTxn) continue;

            //Run Through Filter
            if (CursorFilter(cursor, partialTxn)) partialTxns.push(partialTxn);    
                
        }

        //update cursor
        cursor = await UpdateCursor(cursor, txnHashes, maxBlock);

        return {
            cursor: cursor,
            txns: partialTxns,
        };
    }

    //Parse Txn
    async parseTxnID(sdkServer: GlitterSDKServer, txnID:string, type:BridgeType):Promise<PartialBridgeTxn | undefined>{
        try {
            //Ensure Transaction Exists
            if (!txnID) return undefined;
           
            //Process Transaction
            switch (type) {
                case BridgeType.TokenV1:
                    throw new Error("Token V1 Not Supported for EVM");
                case BridgeType.TokenV2:
                    return await EvmV2Parser.process(sdkServer, this.connect, txnID);
                case BridgeType.Circle:
                    return await EvmCircleParser.process(
                        sdkServer,  
                        this.connect,                      
                        txnID
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
}
