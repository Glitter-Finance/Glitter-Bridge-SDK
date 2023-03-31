import algosdk, {Transaction} from "algosdk";
import BigNumber from "bignumber.js";
import {
    AlgorandStandardAssetConfig,
    AlgorandNativeTokenConfig,
    Routing,
    RoutingDefault,
} from "src/lib/common";
import {BridgeNetworks} from "src/lib/common/networks";
import {
    algoTransferTxnWithRoutingNote,
    assetTransferTxnWithRoutingNote,
} from "../assets";
import {getAlgorandDefaultTransactionParams} from "../utils";
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
    const {routing, tokenConfig} = params;
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
 *
 * @param client
 * @param routing
 * @param tokenConfig
 * @returns
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
 *
 * @param client
 * @param routing
 * @param feeCollector
 * @param tokenConfig
 * @returns
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
    feeRouting.units = undefined;

    if (routing.amount && tokenConfig.feeDivisor) {
        feeRouting.amount = BigNumber(routing.amount).div(tokenConfig.feeDivisor);

        return await getTransferTxByAssetSymbol(client, routing, tokenConfig);
    }

    throw new Error("Amount or fee is undefined, check algorand tokens config");
};

/**
 *
 * @param client
 * @param method
 * @param sourceNetwork
 * @param destiantionNetwork
 * @param routing
 * @param bridgeAppIndex
 * @param token
 * @returns
 */
export const approvalTransaction = async (
    client: algosdk.Algodv2,
    method:
    | AlgorandTokenBridgeDepositTransactions
    | AlgorandTokenBridgeRefundTransactions
    | AlgorandTokenBridgeReleaseTransactions,
    routing: Routing,
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
    const appArgs = buildTokenBridgeTxParams(method, routing, token);
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
 *
 * @param client
 * @param sourceAddress
 * @param destinationAddress
 * @param destinationNetwork
 * @param amount
 * @param vaultConfig
 * @param tokenConfig
 * @returns
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
    const routingInfo: Routing = {
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
            (amount / BigInt(10 ** tokenConfig.decimals)).toString()
        ),
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

    return [appTxn, depositTxn, feeTxn];
};
