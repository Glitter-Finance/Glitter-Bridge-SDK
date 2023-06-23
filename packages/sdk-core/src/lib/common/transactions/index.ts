import BigNumber from "bignumber.js";
import { Routing } from "../routing";
import { Routing2 } from "../routing/routing.v2";

export enum TransactionType {
    Unknown = "Unknown",
    Deposit = "Deposit",
    Release = "Release",
    Refund = "Refund",
    Transfer = "Transfer",
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
    address?: string | null;
    units?: BigNumber | null;
    amount?: BigNumber | number | null;
    routing?: Routing | Routing2 | null;
    protocol?: string | null;
    referral_id?: number | null;
    gasPaid?: BigNumber | null;
    gasUSD?: number | null;
};