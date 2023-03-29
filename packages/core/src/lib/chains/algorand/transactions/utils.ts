import algosdk from "algosdk";

export const getAlgorandDefaultTransactionParams = async (
    client: algosdk.Algodv2
) => {
    const params = await client.getTransactionParams().do();
    params.fee = 1000;
    params.flatFee = true;
    return params;
};
