import { PartialBridgeTxn } from "@glitter-finance/sdk-core";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import IndexerClient from "algosdk/dist/types/client/v2/indexer/indexer";
import { Cursor } from "src/lib/common/cursor";
import { GlitterSDKServer } from "src/lib/glitterSDKServer";

export class AlgorandTokenV2Parser {
    public static async process(
        sdkServer: GlitterSDKServer,
        txnID: string,
        client: AlgodClient | undefined,
        indexer: IndexerClient | undefined,
        cursor: Cursor
    ): Promise<PartialBridgeTxn> {
        throw new Error("Not Implemented");
    }
}