import {
    ConfirmedSignatureInfo,
    GetVersionedTransactionConfig,
    ParsedTransactionWithMeta,
    PartiallyDecodedInstruction,
    TransactionResponse,
    VersionedTransactionResponse,
} from "@solana/web3.js";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import { deserialize } from "borsh";
import bs58 from "bs58";
import {
    BridgeInitSchema,
    BridgeNetworks,
    BridgeReleaseSchema,
    BridgeType,
    ChainStatus,
    PartialBridgeTxn,
    Routing,
    RoutingHelper,
    Sleep,
    TransactionType,
} from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../glitterSDKServer";
import { ServerError } from "../../common/serverErrors";
import { SolanaPollerCommon } from "./poller.solana.common";
import * as util from "util";

export class SolanaV1Parser {
    //V1 Token Process
    public static async process(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta
    ): Promise<PartialBridgeTxn> {
        //Destructure Local Vars
        const txnID = txn.transaction.signatures[0];

        //Set Partial Txn
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: sdkServer.sdk?.solana?.getTxnHashedFromBase58(txnID),
            bridgeType: BridgeType.TokenV1,
            txnType: TransactionType.Unknown,
            network: BridgeNetworks.solana,
        };

        //Try to get the txn details
        try {
            //get client
            const client = sdkServer.sdk?.solana?.client;
            if (!client) throw ServerError.ClientNotSet(BridgeNetworks.solana);

            //Check txn status
            if (txn.meta?.err) {
                partialTxn.chainStatus = ChainStatus.Failed;
                console.log(`Transaction ${txnID} failed`);
            } else {
                partialTxn.chainStatus = ChainStatus.Completed;
            }

            //Get timestamp & slot
            partialTxn.txnTimestamp = new Date((txn.blockTime || 0) * 1000); //*1000 is to convert to milliseconds
            partialTxn.block = txn.slot;

            //Get txnData From Solana
            const txnData = (txn.transaction.message.instructions[0] as PartiallyDecodedInstruction).data;
            const data_bytes = bs58.decode(txnData);

            //Parse Transaction Type
            switch (Number(data_bytes[0])) {
                case 10:
                    partialTxn = this.getV1SolDeposit(sdkServer, txn, data_bytes, partialTxn);
                    break;
                case 11:
                    partialTxn = this.getV1solFinalize(sdkServer, txn, data_bytes, partialTxn);
                    break;
                case 13:
                    partialTxn = this.getV1SOLRelease(sdkServer, txn, data_bytes, partialTxn);
                    break;
                case 20:
                    partialTxn = this.getV1xALGODeposit(sdkServer, txn, data_bytes, partialTxn);
                    break;
                case 21:
                    partialTxn = this.getV1xALGOFinalize(sdkServer, txn, data_bytes, partialTxn);
                    break;
                case 23:
                    partialTxn = this.getV1xALGORelease(sdkServer, txn, data_bytes, partialTxn);
                    break;
                default:
                    console.log(`Txn ${txnID} is not a bridge`);
                    break;
            }
        } catch (e) {
            throw ServerError.ProcessingError(BridgeNetworks.solana, txnID, e);
        }

        return partialTxn;
    }

    //V1 Paths
    private static getV1SolDeposit(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.tokenSymbol = "sol";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeInitSchema.init_schema,
            BridgeInitSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(sdkServer, txn, null, true);
        partialTxn.address = data[0] || "";

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "solana",
            partialTxn.address || "",
            "sol",
            partialTxn.txnID,
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "xsol",
            "",
            BigNumber(instruction["amount"].toString()),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }
    private static getV1xALGODeposit(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 6;

        //Set type
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.tokenSymbol = "xalgo";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeInitSchema.init_schema,
            BridgeInitSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(sdkServer, txn, "xalgo", true);
        partialTxn.address = data[0] || "";

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "solana",
            partialTxn.address || "",
            partialTxn.tokenSymbol,
            partialTxn.txnID,
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "algo",
            "",
            BigNumber(instruction["amount"].toString()),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }
    private static getV1SOLRelease(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "sol";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeReleaseSchema.release_schema,
            BridgeReleaseSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(sdkServer, txn, null, false);
        partialTxn.address = data[0] || "";

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "xsol",
            new TextDecoder().decode(instruction["algo_txn_id"]),
            "solana",
            partialTxn.address || "",
            partialTxn.tokenSymbol,
            partialTxn.txnID,
            BigNumber(instruction["amount"].toString()),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }
    private static getV1xALGORelease(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 6;

        //Set type
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "xalgo";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeReleaseSchema.release_schema,
            BridgeReleaseSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(sdkServer, txn, "xalgo", false);
        partialTxn.address = data[0] || "";

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "algo",
            new TextDecoder().decode(instruction["algo_txn_id"]),
            "solana",
            partialTxn.address || "",
            partialTxn.tokenSymbol,
            partialTxn.txnID,
            BigNumber(instruction["amount"].toString()),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }
    private static getV1solFinalize(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Finalize;

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(sdkServer, txn, null, false);
        partialTxn.tokenSymbol = "sol";
        partialTxn.address = data[0] || "";

        partialTxn.units = BigNumber(data[1]);
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);

        return partialTxn;
    }
    private static getV1xALGOFinalize(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Finalize;

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(sdkServer, txn, "xalgo", false);
        partialTxn.tokenSymbol = "xalgo";
        partialTxn.address = data[0] || "";

        partialTxn.amount = BigNumber(data[1]);
        partialTxn.units = RoutingHelper.BaseUnits_FromReadableValue(partialTxn.amount, decimals);

        return partialTxn;
    }
    private static getV1Routing(
        fromNetwork: string,
        fromAddress: string,
        fromToken: string,
        fromTxnID: string,
        toNetwork: string,
        toAddress: string,
        toToken: string,
        toTxnID: string,
        units: BigNumber,
        decimals: number
    ): Routing {
        return {
            from: {
                network: fromNetwork,
                address: fromAddress,
                token: fromToken,
                txn_signature: fromTxnID,
            },
            to: {
                network: toNetwork,
                address: toAddress,
                token: toToken,
                txn_signature: toTxnID,
            },
            units: units,
            amount: RoutingHelper.ReadableValue_FromBaseUnits(units, decimals),
        };
    }
}
