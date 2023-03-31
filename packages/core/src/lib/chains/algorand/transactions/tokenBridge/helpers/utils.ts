import {
    AlgorandStandardAssetConfig,
    AlgorandNativeTokenConfig,
    Routing,
} from "src/lib/common";
import {
    AlgorandTokenBridgeDepositTransactions,
    buildDepositParams,
} from "./tokenDeposit";
import {AlgorandTokenBridgeRefundTransactions} from "./tokenRefund";
import {
    AlgorandTokenBridgeReleaseTransactions,
    buildReleaseParams,
} from "./tokenRelease";

export const buildTokenBridgeTxParams = (
    method:
    | AlgorandTokenBridgeDepositTransactions
    | AlgorandTokenBridgeRefundTransactions
    | AlgorandTokenBridgeReleaseTransactions,
    routing: Routing,
    tokenConfig: AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
): Uint8Array[] => {
    if (!routing.amount) throw new Error("Amount is required");
    const bigAmount = BigInt(routing.amount.toString());

    switch (method) {
        case AlgorandTokenBridgeDepositTransactions.deposit_algo:
        case AlgorandTokenBridgeDepositTransactions.deposit_xsol:
            return buildDepositParams(
                routing.from.address,
                routing.to.address,
                bigAmount,
        tokenConfig.symbol as "xSOL" | "algo",
        routing.from.txn_signature
            );
        case AlgorandTokenBridgeReleaseTransactions.algo_release:
        case AlgorandTokenBridgeReleaseTransactions.xsol_release:
        case AlgorandTokenBridgeRefundTransactions.algo_refund:
        case AlgorandTokenBridgeRefundTransactions.xsol_refund:
            return buildReleaseParams(
                method,
                routing.from.address,
                routing.to.address,
                bigAmount,
        tokenConfig.symbol as "xSOL" | "algo",
        routing.to.txn_signature
            );
        default:
            return [];
    }
};
