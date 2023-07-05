import algosdk from "algosdk";

/**
 * Retrieves the default transaction parameters for Algorand transactions.
 *
 * @param {algosdk.Algodv2} client - The Algorand client instance.
 * @returns {Promise} - A promise that resolves with the default transaction parameters.
 */
export const getAlgorandDefaultTransactionParams = async (
    client: algosdk.Algodv2
) => {
    const params = await client.getTransactionParams().do();
    params.fee = 1000;
    params.flatFee = true;
    return params;
};
