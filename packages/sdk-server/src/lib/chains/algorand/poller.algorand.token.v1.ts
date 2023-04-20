import { BridgeNetworks, BridgeType, ChainStatus, PartialBridgeTxn, RoutingHelper, TransactionType } from "@glitter-finance/sdk-core";
import { getHashedTransactionId } from "@glitter-finance/sdk-core/dist/lib/common/utils/hashedTransactionId";
import { base64ToBigUIntString, base64ToString } from "@glitter-finance/sdk-core/dist/lib/common/utils/utils";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import IndexerClient from "algosdk/dist/types/client/v2/indexer/indexer";
import BigNumber from "bignumber.js";
import { GlitterSDKServer } from "src/lib/glitterSDKServer";

export class AlgorandTokenV1Parser {
    public static async process(
        sdkServer: GlitterSDKServer,
        txnID: string,
        client: AlgodClient | undefined,
        indexer: IndexerClient | undefined
    ): Promise<PartialBridgeTxn> {

        //Get Algorand Transaction data
        const txnHashed = getHashedTransactionId(BridgeNetworks.algorand, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.TokenV1,
            txnType: TransactionType.Unknown,
            network: "algorand",
            chainStatus: ChainStatus.Completed
        }

        //Fail Safe
        const BASE_LOG = `NewAlgorandTxn: ${txnID}`;
        if (!client) {
            throw new Error(BASE_LOG + " Algorand client not initialized");
        }
        if (!indexer) {
            throw new Error(BASE_LOG + " Algorand indexer not initialized");        
        }
        const txnData = await indexer.lookupTransactionByID(txnID).do();
        if (!txnData) {
            throw new Error(BASE_LOG + " Algorand transaction not found");
        }

        //Get transaction
        const txn = txnData["transaction"];
        const applicationArgs = txn["application-transaction"]["application-args"];
        let txnCall = "";
        if (applicationArgs && applicationArgs != "") txnCall= base64ToString(applicationArgs[4])

        //Timestamp
        const transactionTimestamp = txn["round-time"];
        partialTxn.txnTimestamp = new Date((transactionTimestamp || 0) * 1000); //*1000 is to convert to milliseconds
        partialTxn.block = txn["confirmed-round"];

        switch (txnCall.toLowerCase()) {
            case "xsol-deposit":
                partialTxn = this.xSolDeposit(txn, applicationArgs, partialTxn);
                break;
            case "xsol-release":
                partialTxn = this.xSolRelease(txn, applicationArgs, partialTxn);
                break;
            case "xsol-refund":
                partialTxn = this.xSolRefund(txn, applicationArgs, partialTxn);
                break;
            case "algo-deposit":
                partialTxn = this.algoDeposit(txn, applicationArgs, partialTxn);
                break;
            case "algo-release":
                partialTxn = this.algoRelease(txn, applicationArgs, partialTxn);
                break;
            case "algo-refund":
                partialTxn = this.algoRefund(txn, applicationArgs, partialTxn);
                break;
            default:
                throw new Error (BASE_LOG + " Unknown txn call");
        }

        return partialTxn;

    }
    static xSolDeposit(txn: Record<string, any>, applicationArgs: any, partialTxn: PartialBridgeTxn): PartialBridgeTxn {

        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.tokenSymbol = "xsol";
        partialTxn.address = txn.sender;
        partialTxn.units = BigNumber(base64ToBigUIntString(applicationArgs[6]));
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);

        //Set Routing
        partialTxn.routing = {
            from: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "xsol",
                txn_signature: partialTxn.txnID
            },
            to: {
                network: "solana",
                address: base64ToString(applicationArgs[0]),
                token: "sol",
                txn_signature: ""
            },
            units: partialTxn.units || BigNumber(0),
            amount: partialTxn.amount,
        }

        //return
        return partialTxn;
    }
    static algoDeposit(txn: Record<string, any>, applicationArgs: any, partialTxn: PartialBridgeTxn): PartialBridgeTxn {
        const decimals = 6;

        //Set type
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.tokenSymbol = "algo";
        partialTxn.address = txn.sender;
        partialTxn.units = BigNumber(base64ToBigUIntString(applicationArgs[6]));
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);

        //Set Routing
        partialTxn.routing = {
            from: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "algo",
                txn_signature: partialTxn.txnID
            },
            to: {
                network: "solana",
                address: base64ToString(applicationArgs[0]),
                token: "xsol",
                txn_signature: ""
            },
            units: partialTxn.units,
            amount: partialTxn.amount,
        }

        //return
        return partialTxn;
    }
    static xSolRelease(txn: Record<string, any>, applicationArgs: any, partialTxn: PartialBridgeTxn): PartialBridgeTxn {

        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "xsol";
        partialTxn.address = txn["application-transaction"].accounts[0];
        partialTxn.units = BigNumber(base64ToBigUIntString(applicationArgs[6]));
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);

        //Set Routing
        partialTxn.routing = {
            from: {
                network: "solana",
                address: base64ToString(applicationArgs[0]),
                token: "sol",
                txn_signature: base64ToString(applicationArgs[5])
            },
            to: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "xsol",
                txn_signature: ""
            },
            units: partialTxn.units,
            amount: partialTxn.amount,
        }

        //return
        return partialTxn;

    }
    static algoRelease(txn: Record<string, any>, applicationArgs: any, partialTxn: PartialBridgeTxn): PartialBridgeTxn {
        const decimals = 6;

        //Set type
        partialTxn.txnType = TransactionType.Release;
        partialTxn.tokenSymbol = "algo";
        partialTxn.address = txn["application-transaction"].accounts[0];
        partialTxn.units = BigNumber(base64ToBigUIntString(applicationArgs[6]));
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);

        //Set Routing
        partialTxn.routing = {
            from: {
                network: "solana",
                address: base64ToString(applicationArgs[0]),
                token: "xalgo",
                txn_signature: base64ToString(applicationArgs[5])
            },
            to: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "algo",
                txn_signature: ""
            },
            units: partialTxn.units,
            amount: partialTxn.amount,
        }

        //return
        return partialTxn;
    }
    static algoRefund(txn: Record<string, any>, applicationArgs: any, partialTxn: PartialBridgeTxn): PartialBridgeTxn {

        const decimals = 6;

        //Set type
        partialTxn.txnType = TransactionType.Refund;
        partialTxn.tokenSymbol = "algo";
        partialTxn.address = txn["application-transaction"].accounts[0];
        partialTxn.units = BigNumber(base64ToBigUIntString(applicationArgs[6]));
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);

        //Set Routing
        partialTxn.routing = {
            from: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "algo",
                txn_signature: base64ToString(applicationArgs[5])
            },
            to: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "algo",
                txn_signature: ""
            },
            units: partialTxn.units,
            amount: partialTxn.amount,
        }

        //return
        return partialTxn;
    }
    static xSolRefund(txn: Record<string, any>, applicationArgs: any, partialTxn: PartialBridgeTxn): PartialBridgeTxn {
        const decimals = 9;

        //Set type
        partialTxn.txnType = TransactionType.Refund;
        partialTxn.tokenSymbol = "xsol";
        partialTxn.address = txn["application-transaction"].accounts[0];
        partialTxn.units = BigNumber(base64ToBigUIntString(applicationArgs[6]));
        partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);

        //Set Routing
        partialTxn.routing = {
            from: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "xsol",
                txn_signature: base64ToString(applicationArgs[5])
            },
            to: {
                network: "algorand",
                address: partialTxn.address || "",
                token: "xsol",
                txn_signature: ""
            },
            units: partialTxn.units,
            amount: partialTxn.amount,
        }

        //return
        return partialTxn;
    }
}