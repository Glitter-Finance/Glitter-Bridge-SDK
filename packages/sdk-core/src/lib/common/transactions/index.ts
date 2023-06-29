import BigNumber from "bignumber.js";
import { Routing } from "../routing";
import { Routing2 } from "../routing/routing.v2";

export enum TransactionType {
    Unknown = "Unknown",
    Deposit = "Deposit",
    Release = "Release",
    Refund = "Refund",
    Transfer = "Transfer",
    GasDeposit = "GasDeposit",
    Finalize = "Finalize",
    FeeTransfer = "FeeTransfer",
    Error = "Error",
}
export enum ChainStatus {
    Unknown = "Unknown",
    Pending = "Pending",
    Completed = "Completed",
    Failed = "Failed",
    Cancelled = "Cancelled",
}
export enum BridgeType {
    Unknown = "Unknown",
    Circle = "Circle",
    TokenV1 = "TokenV1",
    TokenV2 = "TokenV2",
}

/**
 * @deprecated Use PartialTxn instead.
 */
export type PartialBridgeTxn = PartialTxn;
export type PartialTxn = {
    txnID: string;
    txnIDHashed?: string;
    bridgeType?: BridgeType;
    txnTimestamp?: Date;
    block?: number;
    confirmations?: number;
    txnType: TransactionType;
    chainStatus?: ChainStatus | null;
    network?: string | null;
    tokenSymbol?: string | null;
    baseSymbol?: string | null;
    address?: string | null;
    units?: BigNumber | null;
    amount?: BigNumber | number | null;
    routing?: Routing | Routing2 | null;
    protocol?: string | null;
    referral_id?: number | null;
    gasPaid?: BigNumber | null;
};

export function PartialBridgeTxnEquals(a: PartialBridgeTxn, b: PartialBridgeTxn): boolean {
    const differences = [];
    if (a.txnID !== b.txnID) differences.push("txnID");
    if (a.txnIDHashed !== b.txnIDHashed) differences.push("txnIDHashed");
    if (a.bridgeType !== b.bridgeType) differences.push("bridgeType");
    if (a.txnTimestamp !== b.txnTimestamp) differences.push("txnTimestamp");
    if (a.block !== b.block) differences.push("block");
    //if (a.confirmations !== b.confirmations) differences.push("confirmations");
    if (a.txnType !== b.txnType) differences.push("txnType");
    if (a.chainStatus !== b.chainStatus) differences.push("chainStatus");
    if (a.network !== b.network) differences.push("network");
    if (a.tokenSymbol !== b.tokenSymbol) differences.push("tokenSymbol");
    if (a.baseSymbol !== b.baseSymbol) differences.push("baseSymbol");
    if (a.address !== b.address) differences.push("address");
    if (a.units !== b.units) differences.push("units");
    if (a.amount !== b.amount) differences.push("amount");
    if (a.routing !== b.routing) differences.push("routing");
    if (a.protocol !== b.protocol) differences.push("protocol");
    if (a.referral_id !== b.referral_id) differences.push("referral_id");
    if (a.gasPaid !== b.gasPaid) differences.push("gasPaid");
    
    if (differences.length > 0) {
        console.log("PartialBridgeTxnEquals: differences", differences);
        return false;
    }
    return true;
}