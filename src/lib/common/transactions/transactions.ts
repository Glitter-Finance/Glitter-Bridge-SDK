import BigNumber from "bignumber.js";
import { Routing } from "../routing/routing"

export enum TransactionType{
    Unknown = "Unknown",
    Deposit = "Deposit",
    Release = "Release",
    Refund =  "Refund",
    Transfer = "Transfer",
    Finalize = "Finalize",
    FeeTransfer = "FeeTransfer",
    Error = "Error",
}
export enum ChainStatus{
    Unknown = "Unknown",
    Pending = "Pending",
    Completed = "Completed",
    Failed = "Failed",
    Cancelled = "Cancelled",
}
export enum BridgeType{
    Unknown = "Unknown",
    USDC = "USDC",
    Token = "Token",
}

export type PartialBridgeTxn ={
    txnID:string, 
    txnIDHashed?:string,
    bridgeType?:BridgeType,
    txnTimestamp?:Date,
    block?:number,
    txnType:TransactionType, 
    chainStatus?:ChainStatus|null,
    network?:string|null,
    tokenSymbol?:string|null,
    address?:string|null,
    units?:BigNumber|null,
    amount?:BigNumber|number|null,
    routing?:Routing |null    
};

