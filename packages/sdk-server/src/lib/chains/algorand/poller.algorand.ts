import {BridgeNetworks, BridgeType, PartialBridgeTxn} from "@glitter-finance/sdk-core";
import {GlitterSDKServer} from "../../glitterSDKServer";
import {Cursor, NewCursor} from "../../common/cursor";
import {GlitterPoller, PollerResult} from "../../common/poller.Interface";

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
        throw new Error("Method not implemented.");
    }
}
