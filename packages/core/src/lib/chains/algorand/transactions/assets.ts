import algosdk, {Transaction} from "algosdk";
import {Routing} from "src";
import {AlgorandStandardAssetConfig} from "../../../../lib/common";
import {getAlgorandDefaultTransactionParams} from "./utils";

/**
 *
 * @param client
 * @param address
 * @param tokenConfig
 * @returns
 */
export const assetOptin = async (
    client: algosdk.Algodv2,
    address: string,
    tokenConfig: AlgorandStandardAssetConfig
): Promise<Transaction> => {
    const suggestedParams = await getAlgorandDefaultTransactionParams(client);
    const transactionOptions = {
        from: address,
        assetIndex: tokenConfig.assetId,
        to: address,
        amount: 0,
        note: undefined,
        closeRemainderTo: undefined,
        revocationTarget: undefined,
        rekeyTo: undefined,
        suggestedParams,
    };

    return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
        transactionOptions
    );
};

/**
 *
 * @param client
 * @param addressClosing
 * @param addressReceiving
 * @returns
 */
export const closeOutAccount = async (
    client: algosdk.Algodv2,
    addressClosing: string,
    addressReceiving: string
): Promise<Transaction> => {
    const suggestedParams = await getAlgorandDefaultTransactionParams(client);
    const note = algosdk.encodeObj({
        date: `${new Date()}`,
    });

    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        suggestedParams,
        from: addressClosing,
        to: addressReceiving,
        amount: Number(0),
        note: note,
        closeRemainderTo: addressReceiving,
        rekeyTo: undefined,
    });
};

/**
 *
 * @param client
 * @param addressClosing
 * @param addressReceiving
 * @param token_asset_id
 * @returns
 */
export const closeOutToken = async (
    client: algosdk.Algodv2,
    addressClosing: string,
    addressReceiving: string,
    token_asset_id: number
): Promise<Transaction> => {
    const suggestedParams = await getAlgorandDefaultTransactionParams(client);
    const transactionOptions = {
        from: addressClosing,
        assetIndex: token_asset_id,
        to: addressReceiving,
        amount: 0,
        note: undefined,
        closeRemainderTo: addressReceiving,
        revocationTarget: undefined,
        rekeyTo: undefined,
        suggestedParams,
    };

    return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
        transactionOptions
    );
};

/**
 *
 * @param client
 * @param routing
 * @param tokenConfig
 * @returns
 */
export const assetTransferTxnWithRoutingNote = async (
    client: algosdk.Algodv2,
    routing: Routing,
    tokenConfig: AlgorandStandardAssetConfig
): Promise<algosdk.Transaction> => {
    const params = await getAlgorandDefaultTransactionParams(client);
    const note = algosdk.encodeObj({
        routing: JSON.stringify(routing),
        date: `${new Date()}`,
    });

    return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: params,
        assetIndex: tokenConfig.assetId,
        from: routing.from.address,
        to: routing.to.address,
        amount: Number(routing.units),
        note: note,
        closeRemainderTo: undefined,
        revocationTarget: undefined,
        rekeyTo: undefined,
    });
};

/**
 *
 * @param client
 * @param routing
 * @returns
 */
export const algoTransferTxnWithRoutingNote = async (
    client: algosdk.Algodv2,
    routing: Routing
): Promise<algosdk.Transaction> => {
    const params = await getAlgorandDefaultTransactionParams(client);
    const note = algosdk.encodeObj({
        routing: JSON.stringify(routing),
        date: `${new Date()}`,
    });

    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        suggestedParams: params,
        from: routing.from.address,
        to: routing.to.address,
        amount: Number(routing.units),
        note: note,
        closeRemainderTo: undefined,
        rekeyTo: undefined,
    });
};
