import BigNumber from "bignumber.js";
import { Routing } from "../routing";
import { Routing2 } from "../routing/routing.v2";
import { Token2Config } from "../tokens";
import { GlitterBridgeSDK } from "src/GlitterBridgeSDK";
import { BridgeNetworks } from "../networks";
import { CurrentBlock } from "../blocks";

/**
 * Enum representing transaction types.
 * @enum {string}
 */
export enum TransactionType {
    Unknown = "Unknown",
    Deposit = "Deposit",
    Release = "Release",
    Refund = "Refund",
    TransferStart = "TransferStart",
    TransferEnd = "TransferEnd",
    Transfer = "Transfer",
    GasDeposit = "GasDeposit",
    Finalize = "Finalize",
    FeeTransfer = "FeeTransfer",
    Error = "Error",
    BadRouting = "BadRouting",
}
/**
 * Enum representing chain status.
 * @enum {string}
 */
export enum ChainStatus {
    Unknown = "Unknown",
    Pending = "Pending",
    Completed = "Completed",
    Failed = "Failed",
    Cancelled = "Cancelled",
}

export enum BridgeStatus {
    Unknown = "Unknown",
    DepositReceived = "Deposit Received",
    DepositConfirmed = "Deposit Confirmed",
    WaitingForInternalTransfer = "Waiting For Internal Transfer",
    InternalTransferReceived = "Internal Transfer Received",
    InternalTransferConfirmed = "Internal Transfer Confirmed",
    WaitingForRelease = "Waiting For Release",
    ReleaseReceived = "Release Received",
    ReleaseConfirmed = "Release Confirmed",
}

export enum USDCBridgeStatus {
    Unknown = 0,
    DepositReceived = 1,
    DepositConfirmed = 2,
    InternalTransferStarted = 3,
    InternalTransferReceived = 4,
    Released = 5
}
export function USDCBridgeStatusDescription(status: USDCBridgeStatus): string {
    switch (status) {
        case USDCBridgeStatus.DepositReceived:
            return "Deposit Received.  Waiting for {x} of {y} confirmations.";
        case USDCBridgeStatus.DepositConfirmed:
            return "Deposit Confirmed.  Waiting for internal transfer.";
        case USDCBridgeStatus.InternalTransferStarted:
            return "Transferred out of deposit chain.  Waiting to receive on destination chain.";
        case USDCBridgeStatus.InternalTransferReceived:
            return "Transfer to destination chain received. Waiting for final release.";
        // case USDCBridgeStatus.InternalTransferConfirmed:
        //     return "Internal Transfer Confirmed";
        //     return "Transfer to destination chain received. Waiting for confirmation.";
        case USDCBridgeStatus.Released:
            return "Released.  Funds have arrived at destination.";
        default:
            return "Unknown";
    }
}
export async function USDCBridgeProgress(status: USDCBridgeStatus, sdk?:GlitterBridgeSDK, chain?:BridgeNetworks, startBlock?:number,): Promise<number> {
    switch (status) {
        case USDCBridgeStatus.DepositReceived:
         
            if (!sdk || !startBlock || !chain){
                return 10;
            } else {

                //Get percent of confirmations
                const confirmations = sdk.confirmationsRequired(chain);
                const currentBlock = await CurrentBlock.getCurrentBlock(sdk, chain);
                const percent = (currentBlock.block - startBlock) / confirmations;
                const weightedPercent = clamp(10 + (percent)* 70, 10, 80);
                return Number((weightedPercent).toFixed(0));
            }

        case USDCBridgeStatus.DepositConfirmed:
            return 80;
        case USDCBridgeStatus.InternalTransferStarted:
            return 85;
        case USDCBridgeStatus.InternalTransferReceived:
            return 95;
        case USDCBridgeStatus.Released:
            return 100;
        default:
            return 0;
    }
}

export enum TokenBridgeStatus {
    Unknown = 0,
    DepositReceived = 1,
    DepositConfirmed = 2,
    Released = 3
}
export function TokenBridgeStatusDescription(status: TokenBridgeStatus): string {
    switch (status) {
        case TokenBridgeStatus.DepositReceived:
            return "Deposit Received.  Waiting for {x} of {y} confirmations.";
        case TokenBridgeStatus.DepositConfirmed:
            return "Deposit Confirmed.  Waiting for final release.";
        case TokenBridgeStatus.Released:
            return "Released.  Funds have arrived at destination.";
        default:
            return "Unknown";
    }
}
export async function TokenBridgeProgress(status: TokenBridgeStatus, sdk?:GlitterBridgeSDK, chain?:BridgeNetworks, startBlock?:number,): Promise<number> {
    switch (status) {
        case TokenBridgeStatus.DepositReceived:
         
            if (!sdk || !startBlock || !chain){
                return 20;
            } else {

                //Get percent of confirmations
                const confirmations = sdk.confirmationsRequired(chain);
                const currentBlock = await CurrentBlock.getCurrentBlock(sdk, chain);
                const percent = (currentBlock.block - startBlock) / confirmations;
                const weightedPercent = clamp(20 + (percent)* 70, 20, 70);

                //clamp weightedpercent
    
                return Number((weightedPercent).toFixed(0));

            }

        case TokenBridgeStatus.DepositConfirmed:
            return 90;
        case TokenBridgeStatus.Released:
            return 100;
        default:
            return 0;
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Enum representing bridge type.
 * @enum {string}
 */
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

/**
 * Type representing a partial transaction.
 * @typedef {object} PartialTxn
 * @property {string} txnID - The transaction ID.
 * @property {string} [txnIDHashed] - The hashed transaction ID.
 * @property {BridgeType} [bridgeType] - The bridge type.
 * @property {Date} [txnTimestamp] - The transaction timestamp.
 * @property {number} [block] - The block number.
 * @property {number} [confirmations] - The number of confirmations.
 * @property {TransactionType} txnType - The transaction type.
 * @property {ChainStatus | null} [chainStatus] - The chain status.
 * @property {string | null} [network] - The network.
 * @property {string | null} [tokenSymbol] - The token symbol.
 * @property {string | null} [baseSymbol] - The base symbol.
 * @property {string | null} [address] - The address.
 * @property {BigNumber | null} [units] - The units.
 * @property {BigNumber | number | null} [amount] - The amount.
 * @property {Routing | Routing2 | null} [routing] - The routing information.
 * @property {string | null} [protocol] - The protocol.
 * @property {number | null} [referral_id] - The referral ID.
 * @property {BigNumber | null} [gasPaid] - The gas paid.
 */
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