import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import { BridgeNetworks } from "../../../../../lib/common/networks";
import { AlgorandStandardAssetConfig, Routing } from "../../../../../lib/common";
import { getAlgorandDefaultTransactionParams } from "../utils";

async function validParams(params: {
  sourceAddress: string;
  destinationAddress: string;
  destinationNetwork: BridgeNetworks;
  amount: BigNumber;
  tokenConfig: AlgorandStandardAssetConfig
}): Promise<boolean> {
    if(params.tokenConfig.minTransfer) {
        if (params.amount.lt(BigNumber(params.tokenConfig.minTransfer))) {
            return Promise.reject(new Error("Amount should exceed 1 USDC"));
        }
    }

    if (params.destinationNetwork === BridgeNetworks.algorand) {
        return Promise.reject(
            new Error("Destination network can not be same as source network")
        );
    }

    if (params.tokenConfig.symbol !== "USDC") {
        return Promise.reject(
            new Error("USDC Configuration expected")
        );
    }

    return true;
}

/**
 * Initiates a bridge transaction for USDC from the source network to the destination network.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {string} sourceAddress - The source address on the source network.
 * @param {string} destinationAddress - The destination address on the destination network.
 * @param {BridgeNetworks} destinationNetwork - The destination network type.
 * @param {BigNumber} amount - The amount of USDC to be bridged.
 * @param {string} bridgeDepositAddress - The address to deposit USDC for bridging.
 * @param {AlgorandStandardAssetConfig} usdcConfig - The USDC token configuration object.
 * @returns {Promise<algosdk.Transaction[]>} - A promise that resolves with an array of bridge transactions.
 */
export const bridgeUSDC = async (
    client: algosdk.Algodv2,
    sourceAddress: string,
    destinationAddress: string,
    destinationNetwork: BridgeNetworks,
    amount: BigNumber,
    bridgeDepositAddress: string,
    usdcConfig: AlgorandStandardAssetConfig
): Promise<algosdk.Transaction[]> => {
    validParams({
        amount,
        sourceAddress,
        destinationAddress,
        destinationNetwork,
        tokenConfig: usdcConfig
    });
    const params = await getAlgorandDefaultTransactionParams(client);
    const routingData: Routing = {
        from: {
            token: usdcConfig.symbol,
            network: BridgeNetworks.algorand.toString().toLowerCase(),
            address: sourceAddress,
            txn_signature: "",
        },
        to: {
            token: usdcConfig.symbol,
            network: destinationNetwork.toString().toLowerCase(),
            address: destinationAddress,
            txn_signature: "",
        },
        amount: amount.div(10 ** usdcConfig.decimals).dp(2),
        units: amount,
    };

    const note = JSON.stringify({
        system: routingData,
        date: new Date().toISOString(),
    })

    const decoded = new TextEncoder().encode(note);

    const depositTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: params,
        assetIndex: usdcConfig.assetId,
        from: sourceAddress,
        to: bridgeDepositAddress,
        amount: BigInt(amount.toString()),
        note: decoded,
        closeRemainderTo: undefined,
        revocationTarget: undefined,
        rekeyTo: undefined,
    });

    return [depositTxn];
};
