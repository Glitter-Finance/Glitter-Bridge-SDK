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
/**
 * Represents Tron resources.
 *
 * @typedef {Object} TronResources
 * @property {number} freeNetLimit - The free net limit.
 * @property {number} NetUsed - The net used.
 * @property {number} NetLimit - The net limit.
 * @property {number} TotalNetLimit - The total net limit.
 * @property {number} TotalNetWeight - The total net weight.
 * @property {number} tronPowerLimit - The Tron power limit.
 * @property {number} EnergyUsed - The energy used.
 * @property {number} EnergyLimit - The energy limit.
 * @property {number} TotalEnergyLimit - The total energy limit.
 * @property {number} TotalEnergyWeight - The total energy weight.
 * @property {number} freeNetUsed - The free net used.
 */
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
/**
 * Represents a Tron constant contract.
 *
 * @typedef {Array<{ parameter: { value: { data: string; owner_address: string; contract_address: string; }, type_url: string }, type: string }>} TronConstantContract
 */
export type TronConstantContract = Array<{ parameter: { value: { data: string; owner_address: string; contract_address: string; }, type_url: string }, type: string }>

/**
 * Estimates the energy required for a Tron release transaction.
 *
 * @async
 * @function tronEstimateReleaseTxEnergy
 * @param {any} tronWeb - The TronWeb instance.
 * @param {string} bridgeContractAddress - The address of the bridge contract.
 * @param {BigNumber} amount - The amount to release.
 * @param {string} tronDestinationWallet - The Tron destination wallet address.
 * @param {string} trc20TokenAddress - The TRC20 token address.
 * @param {string} depositTxHashed - The hashed deposit transaction.
 * @param {string} releaseAccountAddress - The release account address.
 * @returns {Promise<TronTriggerConstantContractResult | null>} - A Promise that resolves to the result of the constant contract trigger for estimating the energy required, or null if estimation fails.
 */
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

/**
 * Estimates the energy required for a TRC20 transfer transaction on Tron.
 *
 * @async
 * @function tronEstimateTrc20TransferEnergy
 * @param {any} tronWeb - The TronWeb instance.
 * @param {string} trc20Address - The TRC20 token address.
 * @param {BigNumber} amount - The amount to transfer.
 * @param {string} trc20DestinationWallet - The TRC20 destination wallet address.
 * @param {string} releaseAccountAddress - The release account address.
 * @returns {Promise<TronTriggerConstantContractResult | null>} - A Promise that resolves to the result of the constant contract trigger for estimating the energy required, or null if estimation fails.
 */
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

/**
 * Retrieves the TRX burn amount based on the provided chain parameters and energy value.
 *
 * @async
 * @function getTRXBurnByEnergy
 * @param {Array<{ key: string, value: number }>} chainParams - The chain parameters array.
 * @param {BigNumber} energy - The energy value.
 * @returns {Promise<any>} - A Promise that resolves to the TRX burn amount.
 */
export async function getTRXBurnByEnergy(chainParams: Array<{ key: string; value: number }>, energy: BigNumber) {
    const energyFeeInSun = chainParams.find(x => x.key === "getEnergyFee");

    const sunRequired = energy.times(
        energyFeeInSun!.value
    )

    return toTRX(sunRequired.toString())
}

/**
 * Converts the given amount to TRX.
 *
 * @function toTRX
 * @param {number | string} amount - The amount to convert.
 * @returns {BigNumber} - The amount in TRX as a BigNumber.
 */
export function toTRX(
    amount: number | string
): BigNumber {
    return new BigNumber(amount).div(10 ** 6)
}

/**
 * Converts the given amount from TRX.
 *
 * @function fromTRX
 * @param {number | string} amount - The amount to convert.
 * @returns {BigNumber} - The converted amount from TRX as a BigNumber.
 */
export function fromTRX(
    amount: number | string
): BigNumber {
    return new BigNumber(amount).times(10 ** 6)
}