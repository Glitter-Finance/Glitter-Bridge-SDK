import {
    ParsedTransactionWithMeta,
    PartiallyDecodedInstruction,
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
    LoadSolanaSchema,
    PartialBridgeTxn,
    Routing,
    RoutingHelper,
    TransactionType,
    getHashedTransactionId,
} from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { ServerError } from "../../common/serverErrors";
import { SolanaPollerCommon } from "./poller.solana.common";

/**
 * Glitter Solana V1 Parser class.
 */
export class SolanaV1Parser {

    //constructor
    constructor() {
        LoadSolanaSchema();
    }

    //V1 Token Process
    /**
     * Processes a transaction using the SolanaV1Parser.
     *
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server instance.
     * @param {ParsedTransactionWithMeta} txn - The parsed transaction with metadata.
     * @returns {Promise<PartialBridgeTxn>} A promise that resolves to the partial bridge transaction.
     */
    public static async process(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
    ): Promise<PartialBridgeTxn> {
        
        //Destructure Local Vars
        const txnID = txn.transaction.signatures[0];

        //Set Partial Txn
        const txnHashed = getHashedTransactionId(BridgeNetworks.algorand, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.TokenV1,
            txnType: TransactionType.Unknown,
            network: BridgeNetworks.solana,
            protocol: "Glitter Finance"
        };

        //Try to get the txn details
        try {

            //get client
            const client = sdkServer.sdk?.solana?.connections[sdkServer.sdk?.solana?.defaultConnection];
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

            //get gas
            partialTxn.gasPaid = new BigNumber(txn.meta?.fee || 0);

            //Get txnData From Solana
            const txnData = (txn.transaction.message.instructions[0] as PartiallyDecodedInstruction).data;
            const data_bytes = bs58.decode(txnData);

            //Parse Transaction Type
            switch (Number(data_bytes[0])) {
                case 10:
                    partialTxn = this.getV1SolDeposit(
                        sdkServer,
                        txn,
                        data_bytes,
                        partialTxn
                    );
                    break;
                case 11:
                    partialTxn = this.getV1solFinalize(
                        sdkServer,
                        txn,
                        data_bytes,
                        partialTxn
                    );
                    break;
                case 13:
                    partialTxn = this.getV1SOLRelease(
                        sdkServer,
                        txn,
                        data_bytes,
                        partialTxn
                    );
                    break;
                case 20:
                    partialTxn = this.getV1xALGODeposit(
                        sdkServer,
                        txn,
                        data_bytes,
                        partialTxn
                    );
                    break;
                case 21:
                    partialTxn = this.getV1xALGOFinalize(
                        sdkServer,
                        txn,
                        data_bytes,
                        partialTxn
                    );
                    break;
                case 23:
                    partialTxn = this.getV1xALGORelease(
                        sdkServer,
                        txn,
                        data_bytes,
                        partialTxn
                    );
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
    /**
     * Retrieves a partial bridge transaction for V1 SOL deposit.
     *
     * @private
     * @static
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {ParsedTransactionWithMeta} txn - The parsed transaction with metadata.
     * @param {Uint8Array} data_bytes - The data bytes for the transaction.
     * @param {PartialBridgeTxn} partialTxn - The partial bridge transaction object.
     * @returns {PartialBridgeTxn} The partial bridge transaction for V1 SOL deposit.
     */
    private static getV1SolDeposit(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.tokenSymbol = "SOL";
        partialTxn.baseSymbol = "SOL";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeInitSchema.init_schema,
            BridgeInitSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(
            sdkServer,
            txn,
            null,
            true
        );
        partialTxn.address = data[0] || "";

        const amount = instruction["amount"];
        const roundedAmount = amount;//Number(amount.toFixed(0));

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "solana",
            partialTxn.address || "",
            "SOL",
            partialTxn.txnID,
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "xSOL",
            "",
            BigNumber(roundedAmount),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }

    /**
     * Retrieves a partial bridge transaction for V1 xALGO deposit.
     *
     * @private
     * @static
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {ParsedTransactionWithMeta} txn - The parsed transaction with metadata.
     * @param {Uint8Array} data_bytes - The data bytes for the transaction.
     * @param {PartialBridgeTxn} partialTxn - The partial bridge transaction object.
     * @returns {PartialBridgeTxn} The partial bridge transaction for V1 xALGO deposit.
     */
    private static getV1xALGODeposit(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {
        const decimals = 6;

        //Set type
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.tokenSymbol = "xALGO";
        partialTxn.baseSymbol = "ALGO";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeInitSchema.init_schema,
            BridgeInitSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(
            sdkServer,
            txn,
            "xALGO",
            true
        );
        partialTxn.address = data[0] || "";

        const amount = instruction["amount"];
        const roundedAmount = amount;//Number(amount.toFixed(0));

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "solana",
            partialTxn.address || "",
            partialTxn.tokenSymbol,
            partialTxn.txnID,
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "Algo",
            "",
            BigNumber(roundedAmount),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }

    /**
     * Retrieves a partial bridge transaction for V1 SOL release.
     *
     * @private
     * @static
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {ParsedTransactionWithMeta} txn - The parsed transaction with metadata.
     * @param {Uint8Array} data_bytes - The data bytes for the transaction.
     * @param {PartialBridgeTxn} partialTxn - The partial bridge transaction object.
     * @returns {PartialBridgeTxn} The partial bridge transaction for V1 SOL release.
     */
    private static getV1SOLRelease(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {

        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "SOL";
        partialTxn.baseSymbol = "SOL";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeReleaseSchema.release_schema,
            BridgeReleaseSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(
            sdkServer,
            txn,
            null,
            false
        );
        partialTxn.address = data[0] || "";

        const amount = instruction["amount"];
        const roundedAmount = amount;//Number(amount.toFixed(0));

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "xSOL",
            new TextDecoder().decode(instruction["algo_txn_id"]),
            "solana",
            partialTxn.address || "",
            partialTxn.tokenSymbol,
            partialTxn.txnID,
            BigNumber(roundedAmount),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }

    /**
     * Retrieves a partial bridge transaction for V1 xALGO release.
     *
     * @private
     * @static
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {ParsedTransactionWithMeta} txn - The parsed transaction with metadata.
     * @param {Uint8Array} data_bytes - The data bytes for the transaction.
     * @param {PartialBridgeTxn} partialTxn - The partial bridge transaction object.
     * @returns {PartialBridgeTxn} The partial bridge transaction for V1 xALGO release.
     */
    private static getV1xALGORelease(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        data_bytes: Uint8Array,
        partialTxn: PartialBridgeTxn
    ): PartialBridgeTxn {

        const decimals = 6;

        //Set type
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "xALGO";
        partialTxn.baseSymbol = "ALGO";

        //Deserialize Instructions
        const instruction = deserialize(
            BridgeReleaseSchema.release_schema,
            BridgeReleaseSchema,
            Buffer.from(data_bytes.slice(1))
        );

        //Get Address
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(
            sdkServer,
            txn,
            "xALGO",
            false
        );
        partialTxn.address = data[0] || "";

        const amount = instruction["amount"];
        const roundedAmount = amount;//Number(amount.toFixed(0));

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "algorand",
            algosdk.encodeAddress(instruction["algo_address"]).toString(),
            "ALGO",
            new TextDecoder().decode(instruction["algo_txn_id"]),
            "solana",
            partialTxn.address || "",
            partialTxn.tokenSymbol,
            partialTxn.txnID,
            BigNumber(roundedAmount),
            decimals
        );

        //Set Amount
        partialTxn.amount = partialTxn.routing.amount;
        partialTxn.units = partialTxn.routing.units;

        //return
        return partialTxn;
    }

    /**
     * Retrieves a partial bridge transaction for V1 SOL finalize.
     *
     * @private
     * @static
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {ParsedTransactionWithMeta} txn - The parsed transaction with metadata.
     * @param {Uint8Array} data_bytes - The data bytes for the transaction.
     * @param {PartialBridgeTxn} partialTxn - The partial bridge transaction object.
     * @returns {PartialBridgeTxn} The partial bridge transaction for V1 SOL finalize.
     */
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
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(
            sdkServer,
            txn,
            null,
            false
        );
        partialTxn.tokenSymbol = "SOL";
        partialTxn.baseSymbol = "SOL";
        partialTxn.address = data[0] || "";

        partialTxn.units = BigNumber(data[1]);
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(
            partialTxn.units,
            decimals
        );

        return partialTxn;
    }

    /**
     * Retrieves a partial bridge transaction for V1 xALGO finalize.
     *
     * @private
     * @static
     * @param {GlitterSDKServer} sdkServer - The Glitter SDK server object.
     * @param {ParsedTransactionWithMeta} txn - The parsed transaction with metadata.
     * @param {Uint8Array} data_bytes - The data bytes for the transaction.
     * @param {PartialBridgeTxn} partialTxn - The partial bridge transaction object.
     * @returns {PartialBridgeTxn} The partial bridge transaction for V1 xALGO finalize.
     */
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
        const data = SolanaPollerCommon.getSolanaAddressWithAmount(
            sdkServer,
            txn,
            "xALGO",
            false
        );
        partialTxn.tokenSymbol = "xALGO";
        partialTxn.baseSymbol = "ALGO";
        partialTxn.address = data[0] || "";

        partialTxn.amount = BigNumber(data[1]);
        partialTxn.units = RoutingHelper.BaseUnits_FromReadableValue(
            partialTxn.amount,
            decimals
        );

        return partialTxn;
    }

    /**
     * Retrieves the routing information for a V1 bridge transaction.
     *
     * @private
     * @static
     * @param {string} fromNetwork - The network of the source token.
     * @param {string} fromAddress - The address of the source token.
     * @param {string} fromToken - The symbol or identifier of the source token.
     * @param {string} fromTxnID - The transaction ID on the source network.
     * @param {string} toNetwork - The network of the destination token.
     * @param {string} toAddress - The address of the destination token.
     * @param {string} toToken - The symbol or identifier of the destination token.
     * @param {string} toTxnID - The transaction ID on the destination network.
     * @param {BigNumber} units - The number of units being transferred.
     * @param {number} decimals - The decimal places of the tokens.
     * @returns {Routing} The routing information for the V1 bridge transaction.
     */
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
