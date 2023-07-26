import algosdk, { Transaction } from "algosdk";
import BigNumber from "bignumber.js";
import {
    AlgorandNativeTokenConfig,
    AlgorandStandardAssetConfig,
    BridgeNetworks,
    Routing,
    RoutingDefault,
} from "../../../../common";
import {
    algoTransferTxnWithRoutingNote,
    assetTransferTxnWithRoutingNote,
} from "../assets";
import { getAlgorandDefaultTransactionParams } from "../utils";
import {
    AlgorandTokenBridgeDepositTransactions,
    AlgorandTokenBridgeRefundTransactions,
    AlgorandTokenBridgeReleaseTransactions,
    buildTokenBridgeTxParams,
} from "./helpers";

function validateTokenBridgeTransaction(params: {
    routing: Routing;
    tokenConfig: AlgorandNativeTokenConfig | AlgorandStandardAssetConfig;
}): boolean {
    const { routing, tokenConfig } = params;
    const toNetwork = routing.to.network.toLowerCase();
    const fromNetwork = routing.from.network.toLowerCase();
    const toTokenSymbol = routing.to.token.toLowerCase();
    const fromTokenSymbol = routing.from.token.toLowerCase();

    if (!routing.units || !routing.amount) return false;
    const amount = new BigNumber(routing.amount).toNumber();
    if (tokenConfig.maxTransfer && !isNaN(tokenConfig.maxTransfer)) {
        if (amount > tokenConfig.maxTransfer) {
            return false;
        }
    }
    if (tokenConfig.minTransfer && !isNaN(tokenConfig.minTransfer)) {
        if (amount < tokenConfig.minTransfer) {
            return false;
        }
    }

    if (fromNetwork === "algorand" && toNetwork === "solana") {
        if (fromTokenSymbol === "algo" && toTokenSymbol === "xalgo") return true;
        if (fromTokenSymbol === "xsol" && toTokenSymbol === "sol") return true;
        if (fromTokenSymbol === "usdc" && toTokenSymbol === "usdc") return true;
    }

    return false;
}

/**
 * Retrieves a transfer transaction based on the asset symbol.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {Routing} routing - The routing object.
 * @param {AlgorandNativeTokenConfig|AlgorandStandardAssetConfig} [tokenConfig] - Optional token configuration object.
 * @returns {Promise<algosdk.Transaction>} - A promise that resolves with the transfer transaction.
 */
const getTransferTxByAssetSymbol = async (
    client: algosdk.Algodv2,
    routing: Routing,
    tokenConfig?: AlgorandNativeTokenConfig | AlgorandStandardAssetConfig
): Promise<algosdk.Transaction> => {
    switch (routing.from.token.trim().toLowerCase()) {
        case "algo":
            return await algoTransferTxnWithRoutingNote(client, routing);
        default:
            if (!tokenConfig)
                return Promise.reject("Alogrand token config is required.");
            if (!(tokenConfig as AlgorandStandardAssetConfig).assetId)
                return Promise.reject("Asset ID required for non algo transaction.");
            return await assetTransferTxnWithRoutingNote(
                client,
                routing,
                tokenConfig as AlgorandStandardAssetConfig
            );
    }
};

/**
 * Generates a fee transaction for a specified fee collector and token configuration.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {Routing} routing - The routing object.
 * @param {string} feeCollector - The address of the fee collector.
 * @param {AlgorandNativeTokenConfig|AlgorandStandardAssetConfig} tokenConfig - The token configuration object.
 * @returns {Promise<Transaction>} - A promise that resolves with the fee transaction.
 */
export const feeTransaction = async (
    client: algosdk.Algodv2,
    routing: Routing,
    feeCollector: string,
    tokenConfig: AlgorandNativeTokenConfig | AlgorandStandardAssetConfig
): Promise<Transaction> => {
    /**
     * FeeRouting seems to be copy
     * of actual routing but with address
     * and network updated to network algorand
     * and address of feeCollector
     */
    const feeRouting = RoutingDefault(routing);
    feeRouting.to.network = "algorand";
    feeRouting.to.token = feeRouting.from.token;
    feeRouting.to.address = feeCollector;
    if (routing.amount && tokenConfig.feeDivisor) {
        feeRouting.units = new BigNumber(routing.units).div(tokenConfig.feeDivisor).dp(0);
        feeRouting.amount = new BigNumber(feeRouting.units).div(10 ** tokenConfig.decimals)

        return await getTransferTxByAssetSymbol(client, feeRouting, tokenConfig);
    }

    throw new Error("Amount or fee is undefined, check algorand tokens config");
};

/**
 * Generates an approval transaction for a specified method and token configuration.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {AlgorandTokenBridgeDepositTransactions|AlgorandTokenBridgeRefundTransactions|AlgorandTokenBridgeReleaseTransactions} method - The method type for the approval (either "AlgorandTokenBridgeDepositTransactions", "AlgorandTokenBridgeRefundTransactions", or "AlgorandTokenBridgeReleaseTransactions").
 * @param {Routing} routing - The routing object.
 * @param {string} destinationOnChainAddress - The destination on-chain address.
 * @param {number} bridgeAppIndex - The index of the bridge app.
 * @param {string} vault - The vault address.
 * @param {AlgorandStandardAssetConfig|AlgorandNativeTokenConfig} token - The token configuration object.
 * @returns {Promise<Transaction>} - A promise that resolves with the approval transaction.
 */
export const approvalTransaction = async (
    client: algosdk.Algodv2,
    method:
        | AlgorandTokenBridgeDepositTransactions
        | AlgorandTokenBridgeRefundTransactions
        | AlgorandTokenBridgeReleaseTransactions,
    routing: Routing,
    destinationOnChainAddress: string,
    bridgeAppIndex: number,
    vault: string,
    token: AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
): Promise<Transaction> => {
    const params = await getAlgorandDefaultTransactionParams(client);
    const record = {
        routing: JSON.stringify(routing),
        date: `${new Date()}`,
    };
    const note = algosdk.encodeObj(record);
    const appArgs = buildTokenBridgeTxParams(method, routing, destinationOnChainAddress, token);
    const accounts: string[] = [];
    accounts.push(routing.from.address);
    accounts.push(vault);

    return algosdk.makeApplicationNoOpTxnFromObject({
        note: note,
        suggestedParams: params,
        from: routing.from.address,
        accounts: accounts,
        appIndex: bridgeAppIndex,
        appArgs: appArgs,
        rekeyTo: undefined,
    });
};

/**
 * Initiates a bridge deposit transaction from the source network to the destination network.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {number} bridgeAppIndex - The index of the bridge app.
 * @param {string} sourceAddress - The source address on the source network.
 * @param {string} destinationAddress - The destination address on the destination network.
 * @param {BridgeNetworks} destinationNetwork - The destination network type.
 * @param {bigint} amount - The amount to be deposited (as a BigInt).
 * @param {{ algoVault: string, asaVault: string }} vaultConfig - The configuration for the vaults.
 * @param {string} feeCollectorAddress - The address of the fee collector.
 * @param {AlgorandStandardAssetConfig|AlgorandNativeTokenConfig} tokenConfig - The token configuration object.
 * @returns {Promise<Transaction[]>} - A promise that resolves with an array of deposit transactions.
 */
export const bridgeDeposit = async (
    client: algosdk.Algodv2,
    bridgeAppIndex: number,
    sourceAddress: string,
    destinationAddress: string,
    destinationNetwork: BridgeNetworks,
    amount: bigint,
    vaultConfig: {
        algoVault: string;
        asaVault: string;
    },
    feeCollectorAddress: string,
    tokenConfig: AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
): Promise<Transaction[]> => {
    const routingInfo = {
        from: {
            address: sourceAddress,
            network: BridgeNetworks.algorand.toString().toLowerCase(),
            token: tokenConfig.symbol,
        },
        to: {
            address: destinationAddress,
            network: destinationNetwork.toString().toLowerCase(),
            token: tokenConfig.wrappedSymbol ?? tokenConfig.symbol,
        },
        amount: new BigNumber(
            amount.toString()
        ).div(10 ** tokenConfig.decimals).dp(2),
        units: new BigNumber(amount.toString()),
    };

    if (
        !validateTokenBridgeTransaction({
            routing: routingInfo,
            tokenConfig: tokenConfig,
        })
    ) {
        return Promise.reject("Unsupported bridge transaction");
    }

    const isAlgo = tokenConfig.symbol.trim().toLowerCase() === "algo";
    const depositMethod = isAlgo
        ? AlgorandTokenBridgeDepositTransactions.deposit_algo
        : AlgorandTokenBridgeDepositTransactions.deposit_xsol;

    const vault: string = isAlgo ? vaultConfig.algoVault : vaultConfig.asaVault;
    routingInfo.to.address = vault;

    const appTxn = await approvalTransaction(
        client,
        depositMethod,
        routingInfo,
        destinationAddress,
        bridgeAppIndex,
        vault,
        tokenConfig
    );
    const feeTxn = await feeTransaction(
        client,
        routingInfo,
        feeCollectorAddress,
        tokenConfig
    );
    const depositTxn = await getTransferTxByAssetSymbol(
        client,
        routingInfo,
        tokenConfig
    );

    return [appTxn, feeTxn, depositTxn];
};
