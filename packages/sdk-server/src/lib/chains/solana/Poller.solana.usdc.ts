import { Connection, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
    BridgeNetworks,
    BridgeType,
    ChainStatus,
    PartialBridgeTxn,
    Routing,
    RoutingHelper,
    TransactionType,
    getHashedTransactionId,
} from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { Cursor } from "../../common/cursor";
import { ServerError } from "../../common/serverErrors";
import { SolanaPollerCommon } from "./poller.solana.common";

export class SolanaUSDCParser {

    public static async process(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        client: Connection | undefined,
        cursor: Cursor
    ): Promise<PartialBridgeTxn> {
        
        //Destructure Local Vars
        const txnID = txn.transaction.signatures[0];
        const address = cursor.address.toString();

        //Get Solana Transaction data
        const txnHashed = getHashedTransactionId(BridgeNetworks.solana, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.USDC,
            txnType: TransactionType.Unknown,
            network: "solana",
            address: address,
        };

        //Try to get txn details
        try {

            //get client
            if (!client) throw ServerError.ClientNotSet(BridgeNetworks.solana);

            //Check txn status
            if (txn.meta?.err) {
                partialTxn.chainStatus = ChainStatus.Failed;
                console.warn(`Transaction ${txnID} failed`);
            } else {
                partialTxn.chainStatus = ChainStatus.Completed;
            }

            //Get Timestamp & slot
            partialTxn.txnTimestamp = new Date((txn.blockTime || 0) * 1000); //*1000 is to convert to milliseconds
            partialTxn.block = txn.slot;

            //Get deposit note
            let depositNote;
            for (let i = 0; i < txn.transaction.message.instructions.length; i++) {
                try {
                    const data_bytes = bs58.decode((txn.transaction.message.instructions[ i ] as PartiallyDecodedInstruction).data) || "{}";
                    const object = JSON.parse(Buffer.from(data_bytes).toString("utf8"));
                    if (object.system && object.date) {
                        depositNote = object;
                    }
                } catch {
                    try {
                        const parsed_data = (txn.transaction.message.instructions[i] as ParsedInstruction).parsed;
                        const object = JSON.parse(parsed_data);
                        if (object.system && object.date) {
                            depositNote = object;
                        }
                    } catch {}
                }
            }

            //Get Routing Data
            const routing: Routing | null = depositNote
                ? JSON.parse(depositNote.system)
                : null;

            //Check deposit vs release
            if (
                (address && address === sdkServer.sdk?.solana?.getAddress("usdcDeposit")) ||
                (address && address === sdkServer.sdk?.solana?.getAddress("usdcDepositTokenAccount"))
            ) {
                console.info(`Transaction ${txnID} is a deposit`);
                partialTxn = await handleDeposit(sdkServer, txn, routing, partialTxn);
            } else if (
                (address && address === sdkServer.sdk?.solana?.getAddress("usdcReceiver")) ||
                (address && address === sdkServer.sdk?.solana?.getAddress("usdcReceiverTokenAccount"))
            ) {
                console.info(`Transaction ${txnID} is a release`);
                partialTxn = await handleRelease(sdkServer, txn, routing, partialTxn);
            } else {
                console.error(`Transaction ${txnID} is not a deposit or release`);
                partialTxn.txnType = TransactionType.Error;
            }
        } catch (e) {
            partialTxn.txnType = TransactionType.Error;
            console.error(`Transaction ${txnID} failed to parse`);
            console.error(e);
        }

        return partialTxn;
    }
}
async function handleDeposit(
    sdkServer: GlitterSDKServer,
    txn: ParsedTransactionWithMeta,
    routing: Routing | null,
    partialTxn: PartialBridgeTxn
): Promise<PartialBridgeTxn> {

    const decimals = 6;

    //Set type
    partialTxn.tokenSymbol = "usdc";

    //Get Address
    const data = SolanaPollerCommon.getSolanaAddressWithAmount(
        sdkServer,
        txn,
        "usdc",
        true
    );
    partialTxn.address = data[0] || "";

    if (data[1] < 0) {

        //negative delta is a deposit from the user or transfer out
        if (!routing) {
            partialTxn.txnType = TransactionType.Transfer;
        } else {
            partialTxn.txnType = TransactionType.Deposit;
        }

        const value = -data[1] || 0;
        partialTxn.amount = value;
        partialTxn.units = RoutingHelper.BaseUnits_FromReadableValue(
            value,
            decimals
        );

    } else if (data[1] > 0) {

        partialTxn.txnType = TransactionType.Refund; //positive delta is a refund to the user
        const value = data[1] || 0;
        partialTxn.amount = value;
        partialTxn.units = RoutingHelper.BaseUnits_FromReadableValue(
            value,
            decimals
        );

    }

    partialTxn.routing = routing;
    return Promise.resolve(partialTxn);
}
async function handleRelease(
    sdkServer: GlitterSDKServer,
    txn: ParsedTransactionWithMeta,
    routing: Routing | null,
    partialTxn: PartialBridgeTxn
): Promise<PartialBridgeTxn> {
    
    const decimals = 6;

    //Set type
    if (!routing) {
        partialTxn.txnType = TransactionType.Transfer;
        partialTxn.tokenSymbol = "usdc";
    } else {
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "usdc";
    }

    //Get Address
    const data = SolanaPollerCommon.getSolanaAddressWithAmount(
        sdkServer,
        txn,
        "usdc",
        false
    );
    partialTxn.address = data[0] || "";
    const value = data[1] || 0;
    partialTxn.amount = value;
    partialTxn.units = RoutingHelper.BaseUnits_FromReadableValue(value, decimals);

    partialTxn.routing = routing;
    return Promise.resolve(partialTxn);
}
