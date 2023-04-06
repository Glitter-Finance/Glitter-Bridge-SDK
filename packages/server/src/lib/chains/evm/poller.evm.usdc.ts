import { BridgeType, EvmConnect, PartialBridgeTxn, TransactionType } from "@glitter-finance/sdk-core/dist";
import { GlitterSDKServer } from "src/lib/glitterSDKServer";

export class EvmUSDCParser {
    public static async process(
        sdkServer: GlitterSDKServer,
        connect: EvmConnect | undefined,
        txnID: string
    ): Promise<PartialBridgeTxn> {

        //Get Bridge Address
        const bridgeID = connect?.tokenV2BridgePollerAddress;
        if (!bridgeID || typeof bridgeID !== "string")
            throw Error("Bridge ID is undefined");
            
        //Get Solana Transaction data
        const partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: connect?.getTxnHashed(txnID),
            bridgeType: BridgeType.TokenV2,
            txnType: TransactionType.Unknown,
            network: connect?.network,
            address: bridgeID || "",
        };
        //return
        return partialTxn;
    }

}