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
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { Cursor } from "../../common/cursor";
import { ServerError } from "../../common/serverErrors";
import { SolanaPollerCommon } from "./poller.solana.common";
import BigNumber from "bignumber.js";

export class SolanaCircleParser {

    public static async process(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        client: Connection | undefined
    ): Promise<PartialBridgeTxn> {
        
        //Destructure Local Vars
        const txnID = txn.transaction.signatures[0];
        //const address = cursor.address.toString();

        //Get Solana Transaction data
        const txnHashed = getHashedTransactionId(BridgeNetworks.solana, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.Circle,
            txnType: TransactionType.Unknown,
            network: "solana",
            protocol: "Glitter Finance"
        };

        const depositAddress= sdkServer.sdk?.solana?.getAddress("usdcDeposit");
        const depositTokenAddress = sdkServer.sdk?.solana?.getAddress("usdcDepositTokenAccount");
        const receiverAddress = sdkServer.sdk?.solana?.getAddress("usdcReceiver");
        const receiverTokenAddress = sdkServer.sdk?.solana?.getAddress("usdcReceiverTokenAccount");

        //Check if txn is a deposit
        let isDeposit = false;
        let isRelease = false;
        for (let i = 0; i < txn.transaction.message.accountKeys.length; i++) {
            if (txn.transaction.message.accountKeys[i].pubkey.toBase58() === depositAddress ||
                txn.transaction.message.accountKeys[i].pubkey.toBase58() === depositTokenAddress) {
                isDeposit = true;
            }
            if (txn.transaction.message.accountKeys[i].pubkey.toBase58() === receiverAddress ||
                txn.transaction.message.accountKeys[i].pubkey.toBase58() === receiverTokenAddress) {
                isRelease = true;
            }
        }
       
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

            //get gas
            partialTxn.gasPaid = new BigNumber(txn.meta?.fee || 0);

            //Get deposit note
            let depositNote;
            for (let i = 0; i < txn.transaction.message.instructions.length; i++) {
                try {
                    const data_bytes = (bs58.decode((txn.transaction.message.instructions[i] as PartiallyDecodedInstruction).data) || "{}");
                    const object = JSON.parse(Buffer.from(data_bytes).toString('utf8'))
                    if (object.system && object.date) {
                        depositNote = object;
                    }
                } catch {
                    try {
                        const parsed_data = (txn.transaction.message.instructions[i] as ParsedInstruction).parsed;
                        const object = JSON.parse(parsed_data)
                        if (object.system && object.date) {
                            depositNote = object;
                        }
                    } catch { 
                        try {
                            const parsed_data = (txn.transaction.message.instructions[i] as ParsedInstruction).parsed;
                            const object = JSON.parse(JSON.parse(parsed_data))
                            if (object.system && object.date) {
                                depositNote = object;
                            }
                        } catch (noteError) { 
                            // console.error(`Transaction ${txnID} failed to parse`);
                            // console.error(noteError);  
                        }
                    }
                }
            }

            if (!depositNote) {
                console.error(`Transaction ${txnID} failed to parse`);
                partialTxn.txnType = TransactionType.Unknown;//TransactionType.BadRouting;           
                return partialTxn;
            }
            if (typeof depositNote.system == "string"){
                depositNote.system = JSON.parse(depositNote.system);
            }

            //Get Routing Data
            const routing: Routing | null = depositNote ? depositNote.system : null;

            //Check deposit vs release
            if (isDeposit) {
                //console.info(`Transaction ${txnID} is a deposit`);
                partialTxn.address = depositAddress;
                partialTxn = await handleDeposit(sdkServer, txn, routing, partialTxn);
            } else if (isRelease) {
                //console.info(`Transaction ${txnID} is a release`);
                partialTxn.address = receiverAddress;
                partialTxn = await handleRelease(sdkServer, txn, routing, partialTxn);
            } else {
                //console.error(`Transaction ${txnID} is not a deposit or release`);
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
    partialTxn.tokenSymbol = "USDC";
    partialTxn.baseSymbol = "USDC";

    //Get Address
    const data = SolanaPollerCommon.getSolanaAddressWithAmount(
        sdkServer,
        txn,
        "USDC",
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
        partialTxn.tokenSymbol = "USDC";
        partialTxn.baseSymbol = "USDC";
    } else {
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "USDC";
        partialTxn.baseSymbol = "USDC";
    }

    //Get Address
    const data = SolanaPollerCommon.getSolanaAddressWithAmount(
        sdkServer,
        txn,
        "USDC",
        false
    );
    partialTxn.address = data[0] || "";
    const value = data[1] || 0;
    partialTxn.amount = value;
    partialTxn.units = RoutingHelper.BaseUnits_FromReadableValue(value, decimals);

    partialTxn.routing = routing;
    return Promise.resolve(partialTxn);
}
