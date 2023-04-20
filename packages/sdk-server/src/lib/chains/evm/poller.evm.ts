import { BridgeNetworks, BridgeType, EvmConnect, PartialBridgeTxn } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor, CursorFilter, NewCursor, UpdateCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "../../common/serverErrors";
import axios from "axios";
import * as util from "util";
import { EvmV2Parser } from "./poller.evm.token.v2";
import { EvmUSDCParser } from "./poller.evm.usdc";

export class GlitterEVMPoller implements GlitterPoller {
    //EVM Connect
    private apiKey: string | undefined;
    private apiURL: string | undefined;
    private connect: EvmConnect | undefined;
    private network: BridgeNetworks | undefined;

    //Cursors
    public tokenV1Cursor: Cursor | undefined;
    public tokenV2Cursor: Cursor | undefined;
    public usdcCursors: Cursor[] | undefined;

    //Construct class with network
    constructor(sdkServer: GlitterSDKServer, network: BridgeNetworks) {
        this.network = network;

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
            this.tokenV1Cursor = NewCursor(
                this.network, 
                BridgeType.TokenV1, 
                tokenAddress, 
                sdkServer.defaultLimit
            );

        //Add Token V2 Cursor
        const tokenV2Address = this.connect?.tokenV2BridgePollerAddress?.toString();       
        if (tokenV2Address)
            this.tokenV2Cursor = NewCursor(
                this.network,
                BridgeType.TokenV2,
                tokenV2Address,
                sdkServer.defaultLimit
            );

        //Add USDC Cursors
        const usdcAddresses = [
            this.connect?.usdcBridgeDepositAddress?.toString(),
            this.connect?.usdcBridgeReceiverAddress?.toString(),
        ];
        this.usdcCursors = [];
        usdcAddresses.forEach((address) => {
            if (this.network === undefined) throw ServerError.NetworkNotSet();
            if (address)
                this.usdcCursors?.push(NewCursor(this.network, BridgeType.USDC, address, sdkServer.defaultLimit));
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
        console.log(url);

        //Request Data
        const response = await axios.get(url);
        const resultData = JSON.parse(JSON.stringify(response.data));
        const events = resultData.result;

        //Map Signatures
        const signatures: string[] = [];
        const txnHashes: string[] = events.map((event: any) => event.transactionHash);
        signatures.push(...new Set(txnHashes));
        const maxBlock = Math.max(...events.map((event: any) => event.blockNumber));

        //Parse Txns
        const partialTxns: PartialBridgeTxn[] = [];
        for (const txnID of signatures) {
            
            //Ensure Transaction Exists
            if (!txnID) continue;

            //Process Transaction
            let partialTxn: PartialBridgeTxn | undefined;
            switch (cursor.bridgeType) {
                case BridgeType.TokenV1:
                    throw new Error("Token V1 Not Supported for EVM");
                    break;
                case BridgeType.TokenV2:
                    partialTxn = await EvmV2Parser.process(sdkServer, this.connect, txnID);
                    break;
                case BridgeType.USDC:
                    partialTxn = await EvmUSDCParser.process(
                        sdkServer,  
                        this.connect,                      
                        txnID
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
        cursor = await UpdateCursor(cursor, txnHashes, maxBlock);

        return {
            cursor: cursor,
            txns: partialTxns,
        };
    }
}
