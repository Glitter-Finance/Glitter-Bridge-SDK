import { BridgeNetworks, BridgeType, EvmConnect, PartialBridgeTxn } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor, NewCursor } from "../../common/cursor";
import { GlitterPoller, PollerResult } from "../../common/poller.Interface";
import { ServerError } from "../../common/serverErrors";
import axios from "axios";
import * as util from "util";

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
        //Store
        switch (network) {
            case BridgeNetworks.Ethereum:
                this.apiKey = process.env.ETH_API_KEY;
                this.apiURL = process.env.ETH_API_URL;
                this.connect = sdkServer.sdk?.ethereum;
                break;
            case BridgeNetworks.Avalanche:
                this.apiKey = process.env.AVAX_API_KEY;
                this.apiURL = process.env.AVAX_API_URL;
                this.connect = sdkServer.sdk?.avalanche;
                break;
            case BridgeNetworks.Polygon:
                this.apiKey = process.env.POLYGON_API_KEY;
                this.apiURL = process.env.POLYGON_API_URL;
                this.connect = sdkServer.sdk?.polygon;
                break;
            default:
                throw new Error("Invalid Network");
        }
    }

    //Intialize Poller
    initialize(sdkServer: GlitterSDKServer, tokenV2Address?: string): void {
        if (this.network === undefined) throw ServerError.NetworkNotSet();

        //Add Token Cursor
        const tokenAddress = undefined;
        if (tokenAddress)
            this.tokenV1Cursor = NewCursor(this.network, BridgeType.TokenV1, tokenAddress, sdkServer.defaultLimit);

        //Add Token V2 Cursor
        if (tokenV2Address)
            this.tokenV2Cursor = NewCursor(this.network, BridgeType.TokenV2, tokenV2Address, sdkServer.defaultLimit);

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
        const url =
            this.apiURL +
            `/api?module=account&action=tokentx&address=${address}` +
            `&startblock=${startBlock}&offset=${cursor.limit}` +
            `&page=1&sort=asc&apikey=` +
            this.apiKey;

        console.log(url);

        //Request Data
        const response = await axios.get(url);
        const resultData = JSON.parse(JSON.stringify(response.data));
        const results = resultData.result;

        console.log(util.inspect(results, false, null, true /* enable colors */));

        return {
            cursor: cursor,
            txns: [],
        };
    }
}
