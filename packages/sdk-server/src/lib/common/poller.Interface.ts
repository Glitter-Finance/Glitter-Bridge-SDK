import { PartialBridgeTxn } from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../glitterSDKServer";
import { Cursor } from "./cursor";

export interface GlitterPoller {

    //Cursors
    tokenV1Cursor: Cursor | undefined;
    tokenV2Cursor: Cursor | undefined;
    usdcCursors: Cursor[] | undefined;

    //Initialize
    initialize(sdkServer: GlitterSDKServer, tokenV2Address?: string): void;

    //Poll
    pollAll(sdkServer: GlitterSDKServer): Promise<PollerResult[]>;
    poll(sdkServer: GlitterSDKServer, cursor: Cursor): Promise<PollerResult>;
}

export type PollerResult = {
    cursor: Cursor;
    txns: PartialBridgeTxn[];
};

export function pollAllDefault(sdkServer: GlitterSDKServer, poller:GlitterPoller): Promise<PollerResult[]>{

    //Ensure Poller is Initialized
    if (!sdkServer.poller)
        throw new Error("Poller not initialized");

    //Poll All Cursors
    const promises: Promise<PollerResult>[] = [];
    if (poller.tokenV1Cursor) promises.push(poller.poll(sdkServer, poller.tokenV1Cursor));
    if (poller.tokenV2Cursor) promises.push(poller.poll(sdkServer, poller.tokenV2Cursor));
    if (poller.usdcCursors) poller.usdcCursors.forEach((cursor) => promises.push(poller.poll(sdkServer, cursor)));

    //Return
    return Promise.all(promises);
}