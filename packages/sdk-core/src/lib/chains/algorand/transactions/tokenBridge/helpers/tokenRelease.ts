import algosdk from "algosdk";
import { AlgorandTokenBridgeRefundTransactions } from "./tokenRefund";

export enum AlgorandTokenBridgeReleaseTransactions {
  xsol_release = "xSOL-release",
  algo_release = "algo-release",
}

/**
 * Builds release parameters for the Algorand Token Bridge V1 transactions.
 *
 * @param {AlgorandTokenBridgeReleaseTransactions | AlgorandTokenBridgeRefundTransactions} method: the method call (deposit_xsol) or (deposit_algo)
 * @param {string} sourceAddress: the address on foreign chain making the deposit
 * @param {string} destinationAddress: the address on algorand to receive the funds
 * @param {bigint} amount: The amount in microAlgo.
 * @param {"xSOL" | "algo"} tokenSymbol: The token symbol (xSOL or algo).
 * @param {string} txnSignature: Transaction signature of the foreign chain deposit
 * @returns {Uint8Array[]}: Builds the release params for Glitter Bridge v1 deposits
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
