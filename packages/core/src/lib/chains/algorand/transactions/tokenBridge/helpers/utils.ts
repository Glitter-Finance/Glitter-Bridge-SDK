import {Routing} from "src/lib/common";
import {BridgeNetworks} from "src/lib/common/networks/networks";
import {
    AlgorandAssetConfig,
    AlgorandStandardAssetConfig,
} from "../../../types";
import {
    AlgorandTokenBridgeDepositTransactions,
    buildDepositParams,
} from "./tokenDeposit";
import {AlgorandTokenBridgeRefundTransactions} from "./tokenRefund";
import {
    AlgorandTokenBridgeReleaseTransactions,
    buildReleaseParams,
} from "./tokenRelease";
import {
    AlgorandTokenBridgeVaultConfigTransactions,
    AlgorandTokenBridgeVaultTokenTransactions,
    buildTokenVaultConfigTransactionParams,
    buildTokenVaultTokenTransactionParams,
} from "./tokenVault";

export const buildTokenBridgeTxParams = (
    method:
    | AlgorandTokenBridgeDepositTransactions
    | AlgorandTokenBridgeRefundTransactions
    | AlgorandTokenBridgeReleaseTransactions
    | AlgorandTokenBridgeVaultConfigTransactions
    | AlgorandTokenBridgeVaultTokenTransactions,
    sourceNetwork: BridgeNetworks,
    destinationNetwork: BridgeNetworks,
    routing: Routing,
    tokenConfig: AlgorandStandardAssetConfig | AlgorandAssetConfig
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
        case AlgorandTokenBridgeVaultConfigTransactions.optin:
        case AlgorandTokenBridgeVaultConfigTransactions.setup:
        case AlgorandTokenBridgeVaultConfigTransactions.update_fee:
        case AlgorandTokenBridgeVaultConfigTransactions.update_limits:
            if (!(tokenConfig as AlgorandStandardAssetConfig).assetId)
                throw new Error(
                    "Standard Asset ID required for vault config transaction."
                );
            return buildTokenVaultConfigTransactionParams(
                method,
        tokenConfig as AlgorandStandardAssetConfig
            );

        case AlgorandTokenBridgeVaultTokenTransactions.deposit:
        case AlgorandTokenBridgeVaultTokenTransactions.refund:
        case AlgorandTokenBridgeVaultTokenTransactions.release:
            return buildTokenVaultTokenTransactionParams(
                method,
                sourceNetwork,
                destinationNetwork,
                routing.from.address,
                routing.to.address,
                bigAmount,
                routing.from.txn_signature
            );
        default:
            return [];
    }
};
