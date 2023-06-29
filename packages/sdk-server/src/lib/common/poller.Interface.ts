import { BridgeNetworks, BridgeType, PartialBridgeTxn } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor } from "./cursor";

export interface GlitterPoller {

    //Network
    network: BridgeNetworks;

    //Cursors
    cursors: Record<BridgeType, Cursor[]>;
        
    //get cursors
    get tokenV1Cursor(): Cursor | undefined;
    get tokenV2Cursor(): Cursor | undefined;
    get usdcCursors(): Cursor[] | undefined;

    //Initialize
    initialize(sdkServer: GlitterSDKServer, tokenV2Address?: string): void;

    //Poll
    poll(sdkServer: GlitterSDKServer, cursor: Cursor): Promise<PollerResult>;

    //Get Txn
    parseTxnID(sdkServer: GlitterSDKServer, txnID:string, type:BridgeType): Promise<PartialBridgeTxn | undefined>;

}

export type PollerResult = {
    cursor: Cursor;
    txns: PartialBridgeTxn[];
};