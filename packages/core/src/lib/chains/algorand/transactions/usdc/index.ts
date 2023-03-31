import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import {Routing} from "src/lib/common";
import {BridgeNetworks} from "src/lib/common/networks";
import {AlgorandStandardAssetConfig} from "src/lib/common";
import {getAlgorandDefaultTransactionParams} from "../utils";

async function validParams(params: {
  sourceAddress: string;
  destinationAddress: string;
  destinationNetwork: BridgeNetworks;
  amount: BigNumber;
}): Promise<boolean> {
    if (params.amount.lt(BigNumber(1000000))) {
        return Promise.reject(new Error("Amount should exceed 1 USDC"));
    }

    if (params.destinationNetwork === BridgeNetworks.algorand) {
        return Promise.reject(
            new Error("Destination network can not be same as source network")
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
    });
    const params = await getAlgorandDefaultTransactionParams(client);
    const DEFAULT_SYMBOL = "USDC";

    const routingData: Routing = {
        from: {
            token: DEFAULT_SYMBOL,
            network: BridgeNetworks.algorand.toString().toLowerCase(),
            address: sourceAddress,
            txn_signature: "",
        },
        to: {
            token: DEFAULT_SYMBOL,
            network: destinationNetwork.toString().toLowerCase(),
            address: destinationAddress,
            txn_signature: "",
        },
        amount: amount.div(10 ** usdcConfig.decimals).dp(2),
        units: amount,
    };

    const note = algosdk.encodeObj({
        system: JSON.stringify(routingData),
        date: `${new Date()}`,
    });

    const depositTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: params,
        assetIndex: usdcConfig.assetId,
        from: sourceAddress,
        to: bridgeDepositAddress,
        amount: BigInt(amount.toString()),
        note: note,
        closeRemainderTo: undefined,
        revocationTarget: undefined,
        rekeyTo: undefined,
    });

    return [depositTxn];
};
