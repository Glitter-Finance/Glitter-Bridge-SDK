import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import {Routing} from "../../../../..//lib/common";
import {BridgeNetworks} from "../../../../../lib/common/networks";
import {AlgorandStandardAssetConfig} from "../../../../../lib/common";
import {getAlgorandDefaultTransactionParams} from "../utils";

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
    const routingData = {
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
        amount: amount.div(10 ** usdcConfig.decimals).toFixed(2),
        units: amount.toFixed(0),
    };

    const note = algosdk.encodeObj({
        system: routingData,
        date: `${new Date()}`,
    });

    const depositTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: params,
        assetIndex: usdcConfig.assetId,
        from: sourceAddress,
        to: bridgeDepositAddress,
        amount: BigInt(amount.toString()),
        note,
        closeRemainderTo: undefined,
        revocationTarget: undefined,
        rekeyTo: undefined,
    });

    return [depositTxn];
};
