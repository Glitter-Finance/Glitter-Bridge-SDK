import {BridgeNetworks, PartialBridgeTxn} from "@glitter-finance/sdk-core";
import {GlitterSDKServer} from "../glitterSDKServer";
import {Cursor} from "./cursor";

export interface GlitterPoller {
    //Cursors
    tokenV1Cursor: Cursor | undefined;
    tokenV2Cursor: Cursor | undefined;
    usdcCursors: Cursor[] | undefined;

    //Initialize
    initialize(sdkServer: GlitterSDKServer, tokenV2Address?: string): void;

    //Poll
    poll(sdkServer: GlitterSDKServer, cursor: Cursor): Promise<PollerResult>;
}

export type PollerResult = {
    cursor: Cursor;
    txns: PartialBridgeTxn[];
};
