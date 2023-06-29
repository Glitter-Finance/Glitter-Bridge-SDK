import BigNumber from "bignumber.js";

//Interfaces
export interface TronTriggerConstantContractResult {
    result: {
        result: boolean
    },
    energy_used: number,
    constant_result: string[],
    logs: Array<{ address: string; data: string; topics: string[] }>,
    transaction: {
        ret: Array<any>,
        visible: boolean,
        txID: string,
        raw_data: {
            "contract": TronConstantContract,
            "ref_block_bytes": string;
            "ref_block_hash": string;
            "expiration": number;
            "timestamp": number;
        },
        raw_data_hex: string
    },
    internal_transactions: Array<{
        "caller_address": string,
        "note": string,
        "transferTo_address": string,
        "callValueInfo": Array<any>,
        "hash": string
    }>
}

//Types
export type TronResources = {
    freeNetLimit: number,
    NetUsed: number,
    NetLimit: number,
    TotalNetLimit: number,
    TotalNetWeight: number,
    tronPowerLimit: number,
    EnergyUsed: number,
    EnergyLimit: number,
    TotalEnergyLimit: number,
    TotalEnergyWeight: number
    freeNetUsed: number
}
export type TronConstantContract = Array<{ parameter: { value: { data: string; owner_address: string; contract_address: string; }, type_url: string }, type: string }>

export const tronEstimateReleaseTxEnergy = async (
    tronWeb: any,
    bridgeContractAddress: string,
    amount: BigNumber,
    tronDestinationWallet: string,
    trc20TokenAddress: string,
    depositTxHashed: string,
    releaseAccountAddress: string
): Promise<TronTriggerConstantContractResult | null> => {
    const parameters = [
        { type: 'uint256', value: amount.toString() },
        { type: 'address', value: tronDestinationWallet },
        { type: 'address', value: trc20TokenAddress },
        { type: 'bytes32', value: depositTxHashed }
    ];

    const ReleaseMethodAbi = "release(uint256,address,address,bytes32)";
    let transaction = null;

    transaction = await tronWeb.transactionBuilder.triggerConstantContract(
        tronWeb.address.toHex(bridgeContractAddress),
        ReleaseMethodAbi,
        {},
        parameters,
        tronWeb.address.toHex(releaseAccountAddress)
    );

    return transaction as TronTriggerConstantContractResult | null
}

export const tronEstimateTrc20TransferEnergy = async (
    tronWeb: any,
    trc20Address: string,
    amount: BigNumber,
    trc20DestinationWallet: string,
    releaseAccountAddress: string
): Promise<TronTriggerConstantContractResult | null> => {
    const parameters = [
        { type: 'address', value: trc20DestinationWallet },
        { type: 'uint256', value: amount.toString() },
    ];

    const ReleaseMethodAbi = "transfer(address,uint256)";
    let transaction = null;

    transaction = await tronWeb.transactionBuilder.triggerConstantContract(
        tronWeb.address.toHex(trc20Address),
        ReleaseMethodAbi,
        {},
        parameters,
        tronWeb.address.toHex(releaseAccountAddress)
    );

    return transaction as TronTriggerConstantContractResult | null
}
/** Calculate the amount of TRX that will be burned for a given amount of energy */
export async function getTRXBurnByEnergy(chainParams: Array<{ key: string; value: number }>, energy: BigNumber) {
    const energyFeeInSun = chainParams.find(x => x.key === "getEnergyFee");

    const sunRequired = energy.times(
        energyFeeInSun!.value
    )

    return toTRX(sunRequired.toString())
}
export function toTRX(
    amount: number | string
): BigNumber {
    return new BigNumber(amount).div(10 ** 6)
}

export function fromTRX(
    amount: number | string
): BigNumber {
    return new BigNumber(amount).times(10 ** 6)
}