import { BridgeTokens, BridgeNetworks, BridgeType, ChainStatus, DepositNote, PartialBridgeTxn, Routing, RoutingHelper, TransactionType } from "@glitter-finance/sdk-core/dist";
import { getHashedTransactionId } from "@glitter-finance/sdk-core";
import { AlgorandStandardAssetConfig } from "@glitter-finance/sdk-core/dist/lib/common/tokens";
import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import IndexerClient from "algosdk/dist/types/client/v2/indexer/indexer";
import { Cursor } from "../../common/cursor";
import { GlitterSDKServer } from "../../../glitterSDKServer";

export class AlgorandCircleParser {
    public static async process(
        sdkServer: GlitterSDKServer,
        txnID: string,
        client: AlgodClient | undefined,
        indexer: IndexerClient | undefined,
        cursor: Cursor
    ): Promise<PartialBridgeTxn> {
     
        //Destructure Local Vars        
        const address = cursor.address.toString();

        //Get Algorand Transaction data
        const txnHashed = getHashedTransactionId(BridgeNetworks.algorand, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.Circle,
            txnType: TransactionType.Unknown,
            network: "algorand",
            chainStatus: ChainStatus.Completed,
            address: address,
        }
        
        //Fail Safe
        const BASE_LOG = `NewAlgorandTxn: ${txnID}`;
        if (!client) throw new Error(BASE_LOG + " Algorand client not initialized");  
        if (!indexer) throw new Error(BASE_LOG + " Algorand indexer not initialized");        
        const txnData = await indexer.lookupTransactionByID(txnID).do();
        if (!txnData) throw new Error(BASE_LOG + " Algorand transaction not found");
        
        //Get transaction
        const txn = txnData["transaction"];

        //Timestamp
        const transactionTimestamp = txn["round-time"];
        partialTxn.txnTimestamp = new Date((transactionTimestamp || 0) * 1000); //*1000 is to convert to milliseconds
        partialTxn.block = txn["confirmed-round"];

        const noteObj = txn.note ? algosdk.decodeObj(Buffer.from(txn.note, "base64")) as DepositNote : null;
        const note = noteObj ? noteObj["system"] : null;
        const routing: Routing | null = note ? JSON.parse(note) : null;

        //Check deposit vs release
        
        if (address && address === sdkServer.sdk?.algorand?.getAddress("usdcDeposit")) {
            partialTxn = await this.handleDeposit(sdkServer, txnID, txn, routing, partialTxn);
        } else if (address && address === sdkServer.sdk?.algorand?.getAddress("usdcReceiver")) {
            partialTxn = await this.handleRelease(sdkServer, txnID, txn, routing, partialTxn);
        } else {
            throw new Error(BASE_LOG + " Address not found");
        }

        return partialTxn;

    }

    static async handleDeposit(
        sdkServer: GlitterSDKServer,
        txnID: string,
        txn: any,
        routing: Routing | null,
        partialTxn: PartialBridgeTxn): Promise<PartialBridgeTxn> {
        const decimals = 6;

        //Set type
        partialTxn.tokenSymbol = "usdc";

        //Check Asset Send
        if (!txn["asset-transfer-transaction"]) {
            throw new Error(`Transaction ${txnID} is not an asset transaction`);
        }
        const units = txn["asset-transfer-transaction"].amount;
        const assetID = txn["asset-transfer-transaction"]["asset-id"];

        //Check if asset is USDC
        const usdcAsset = BridgeTokens.getToken(BridgeNetworks.algorand, "usdc") as AlgorandStandardAssetConfig;
        const usdcAssetID = usdcAsset.assetId;
        if (assetID !== usdcAssetID) throw new Error(`Transaction ${txnID} is not a USDC transaction`);
        
        const sender = txn.sender;
        if (sender == sdkServer.sdk?.algorand?.getAddress("usdcDeposit")) {

            //This is a transfer or refund
            if (!routing) {
                partialTxn.txnType = TransactionType.Transfer;
            } else {
                partialTxn.txnType = TransactionType.Refund;
            }
            partialTxn.address = txn["asset-transfer-transaction"].receiver;

        } else {
        //this is a deposit
            partialTxn.address = txn.sender;
            partialTxn.txnType = TransactionType.Deposit;
        }

        partialTxn.units = units;
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(units, decimals);

        partialTxn.routing = routing;
        return Promise.resolve(partialTxn);
    }
    static async handleRelease(
        sdkServer: GlitterSDKServer,
        txnID: string,
        txn: any,
        routing: Routing | null,
        partialTxn: PartialBridgeTxn): Promise<PartialBridgeTxn> {
        const decimals = 6;

        //Set type
        partialTxn.tokenSymbol = "usdc";

        //Get Address
        //Check Asset Send
        if (!txn["asset-transfer-transaction"]) {
            throw new Error(`Transaction ${txnID} is not an asset transaction`);
        }
        const units = txn["asset-transfer-transaction"].amount;
        const assetID = txn["asset-transfer-transaction"]["asset-id"];

        //Check if asset is USDC
        const usdcAsset = BridgeTokens.getToken(BridgeNetworks.algorand, "usdc") as AlgorandStandardAssetConfig;
        const usdcAssetID = usdcAsset.assetId;
        if (assetID !== usdcAssetID) throw new Error(`Transaction ${txnID} is not a USDC transaction`);

        const receiver = txn["asset-transfer-transaction"].receiver;
        if (receiver == sdkServer.sdk?.algorand?.getAddress("usdcReceiver")) {
        //This is a transfer
            partialTxn.address = receiver;
            partialTxn.txnType = TransactionType.Transfer;
        } else {
        //this is a release
            partialTxn.address = receiver;
            if (receiver == sdkServer.sdk?.algorand?.getAddress("feeReceiver")) {
                partialTxn.txnType = TransactionType.FeeTransfer;
            } else {
                partialTxn.txnType = TransactionType.Release;
            }

        }

        partialTxn.units = units;
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(units, decimals);

        partialTxn.routing = routing;
        return Promise.resolve(partialTxn);
    }
}