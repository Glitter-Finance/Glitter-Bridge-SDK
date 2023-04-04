import algosdk from "algosdk";
import {AlgorandTokenBridgeRefundTransactions} from "./tokenRefund";

export enum AlgorandTokenBridgeReleaseTransactions {
  xsol_release = "xSOL-release",
  algo_release = "algo-release",
}

/**
 *
 * @param method
 * @param sourceAddress
 * @param destinationAddress
 * @param amount
 * @param tokenSymbol
 * @param txnSignature
 * @returns {Uint8Array[]}
 */
export const buildReleaseParams = (
    method:
    | AlgorandTokenBridgeReleaseTransactions
    | AlgorandTokenBridgeRefundTransactions,
    sourceAddress: string,
    destinationAddress: string,
    amount: bigint,
    tokenSymbol: "xSOL" | "algo",
    txnSignature?: string
): Uint8Array[] => {
    const args: Uint8Array[] = [];
    const solanaAsset =
    tokenSymbol === "xSOL"
        ? "sol"
        : "xALGoH1zUfRmpCriy94qbfoMXHtK6NDnMKzT4Xdvgms";
    args.push(new Uint8Array(Buffer.from(sourceAddress)));
    args.push(new Uint8Array(Buffer.from(destinationAddress)));
    args.push(new Uint8Array(Buffer.from(solanaAsset)));
    args.push(new Uint8Array(Buffer.from(tokenSymbol)));
    args.push(new Uint8Array(Buffer.from(method.toString())));
    args.push(new Uint8Array(Buffer.from(txnSignature ?? "")));
    args.push(algosdk.encodeUint64(amount));
    return args;
};
