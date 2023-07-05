import algosdk, { Transaction } from "algosdk";
import { Routing } from "../../../";
import { AlgorandStandardAssetConfig } from "../../../../lib/common";
import { getAlgorandDefaultTransactionParams } from "./utils";

/**
 * Initiates an asset opt-in transaction for a specified token.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {string} address - The address to opt-in for the asset.
 * @param {AlgorandStandardAssetConfig} tokenConfig - The token configuration object.
 * @returns {Promise<Transaction>} - A promise that resolves with the opt-in transaction.
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
 * Initiates a close-out transaction for an account, transferring its funds to another address.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {string} addressClosing - The address of the account being closed.
 * @param {string} addressReceiving - The address to which the funds will be transferred.
 * @returns {Promise<Transaction>} - A promise that resolves with the close-out transaction.
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
 * Initiates a close-out transaction for a specific token, transferring the token's balance from the closing address to the receiving address.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {string} addressClosing - The address from which the token balance will be closed out.
 * @param {string} addressReceiving - The address that will receive the token balance.
 * @param {number} token_asset_id - The ID of the token being closed out.
 * @returns {Promise<Transaction>} - A promise that resolves with the close-out transaction.
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
 * Creates an asset transfer transaction with routing and note options.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {Routing} routing - The routing object.
 * @param {AlgorandStandardAssetConfig} tokenConfig - The token configuration object.
 * @returns {Promise<algosdk.Transaction>} - A promise that resolves with the asset transfer transaction.
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
 * Creates an Algo transfer transaction with routing and note options.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @param {Routing} routing - The routing object.
 * @returns {Promise<algosdk.Transaction>} - A promise that resolves with the Algo transfer transaction.
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
