import BigNumber from "bignumber.js";
import { BridgeType } from "../transactions";
import { BridgeNetworks } from "../networks";
import { GlitterBridgeSDK } from "../../../GlitterBridgeSDK";
import { BridgeV2Tokens } from "../tokens";
import { TokenPricing } from "../pricing";
import { AlgoGasPrice, EVMGasPrice, SolanaGasPrice, TronGasPrice } from "./gasPriceByChain";

/**
 * Represents gas estimate values.
 *
 * @typedef {Object} GasEstimate
 * @property {number} usd - The estimated gas cost in USD.
 * @property {number | undefined} deposit - The estimated gas cost for deposit (optional).
 * @property {number | undefined} release - The estimated gas cost for release (optional).
 */
export type GasEstimate = {
    usd: number;
    deposit?: number;
    release?: number;
}

/**
 * Represents gas used estimate values.
 *
 * @typedef {Object} GasUsedEstimate
 * @property {BigNumber} source - The estimated gas used for the source.
 * @property {BigNumber} destination - The estimated gas used for the destination.
 */
export type GasUsedEstimate = {
    source: BigNumber;
    destination: BigNumber;
}

/**
 * GasEstimator is a class that provides gas estimation functionality.
 *
 * @class GasEstimator
 */
export class GasEstimator {

    /**
     * Estimates the gas price for a bridge transaction.
     *
     * @static
     * @method estimateGasPrice
     * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
     * @param {string} from - The source address for the bridge transaction.
     * @param {string} to - The destination address for the bridge transaction.
     * @param {BridgeType} type - The type of bridge transaction.
     * @returns {Promise<GasEstimate | undefined>} - A Promise that resolves to the estimated gas price as a GasEstimate object, or undefined if estimation fails.
     */
    public static async estimateGasPrice(
        sdk: GlitterBridgeSDK,
        from: string,
        to: string,
        type: BridgeType
    ): Promise<GasEstimate|undefined> {

        //Validate Params
        if (!from || !to) return undefined;   

        //Iterate through BridgeNetwork enum to get from network
        let fromNetwork: BridgeNetworks | undefined = undefined;
        for (const network in BridgeNetworks) {
            if (network.toLocaleLowerCase() === from.toLocaleLowerCase()) {
                fromNetwork = network as BridgeNetworks;
                break;
            }
        }
        if (!fromNetwork) return undefined;

        //Iterate through BridgeNetwork enum to get to network
        let toNetwork: BridgeNetworks | undefined = undefined;
        for (const network in BridgeNetworks) {
            if (network.toLocaleLowerCase() === to.toLocaleLowerCase()) {
                toNetwork = network as BridgeNetworks;
                break;
            }
        }      
        if (!toNetwork) return undefined;

        let returnValue : GasEstimate | undefined= undefined;
        switch (type) {
            case BridgeType.Circle:
                returnValue = await this.estimateCircleGasPrice(sdk, fromNetwork, toNetwork);
                break;
            case BridgeType.TokenV2:
                returnValue = await this.estimateTokenV2GasPrice(sdk, fromNetwork, toNetwork);
                break;
            case BridgeType.TokenV1:
                switch (fromNetwork.toLocaleLowerCase()) {
                    case BridgeNetworks.algorand.toLocaleLowerCase():
                    case BridgeNetworks.solana.toLocaleLowerCase():
                        break;
                    default:
                        console.log(`Unsupported network ${fromNetwork} for bridge type ${type}`);
                        return undefined;
                }
                switch (toNetwork.toLocaleLowerCase()) {
                    case BridgeNetworks.algorand.toLocaleLowerCase():
                    case BridgeNetworks.solana.toLocaleLowerCase():
                        break;
                    default:
                        console.log(`Unsupported network ${toNetwork} for bridge type ${type}`);
                        return undefined;
                }
                returnValue = {
                    usd: 0,
                    deposit: 0,
                    release: 0,
                }
                break;
          
            default:
                throw new Error("Invalid bridge type");
        }
        if (!returnValue) return undefined;

        //Round to 2 decimals
        returnValue.usd = Math.round(returnValue.usd * 100) / 100;

        return returnValue;

    }

    /**
     * Estimates the gas price for a Circle bridge transaction.
     *
     * @static
     * @method estimateCircleGasPrice
     * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
     * @param {BridgeNetworks} fromNetwork - The source network for the bridge transaction.
     * @param {BridgeNetworks} toNetwork - The destination network for the bridge transaction.
     * @returns {Promise<GasEstimate | undefined>} - A Promise that resolves to the estimated gas price as a GasEstimate object, or undefined if estimation fails.
     */
    private static async estimateCircleGasPrice(
        sdk: GlitterBridgeSDK,
        fromNetwork: BridgeNetworks,
        toNetwork: BridgeNetworks): Promise<GasEstimate | undefined> {

        try {
           
            const fromGasPrice = await this.getCircleFromEstimate(sdk, fromNetwork);
            const toGasPrice = await this.getCircleToEstimate(sdk, toNetwork);
            if (!fromGasPrice||!toGasPrice) return undefined

            return {
                usd: fromGasPrice.plus(toGasPrice).toNumber(),
                deposit: fromGasPrice.toNumber(),
                release: toGasPrice.toNumber(),
            }

        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    /**
     * Estimates the gas price for a TokenV2 bridge transaction.
     *
     * @static
     * @method estimateTokenV2GasPrice
     * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
     * @param {BridgeNetworks} fromNetwork - The source network for the bridge transaction.
     * @param {BridgeNetworks} toNetwork - The destination network for the bridge transaction.
     * @returns {Promise<GasEstimate | undefined>} - A Promise that resolves to the estimated gas price as a GasEstimate object, or undefined if estimation fails.
     */
    private static async estimateTokenV2GasPrice(
        sdk: GlitterBridgeSDK,
        fromNetwork: BridgeNetworks,
        toNetwork: BridgeNetworks): Promise<GasEstimate | undefined> {

        try {
           
            const fromGasPrice = await this.getTokenV2FromEstimate(sdk, fromNetwork);
            const toGasPrice = await this.getTokenV2ToEstimate(sdk, toNetwork);
            if (!fromGasPrice||!toGasPrice) return undefined

            return {
                usd: fromGasPrice.plus(toGasPrice).toNumber(),
                deposit: fromGasPrice.toNumber(),
                release: toGasPrice.toNumber(),
            }

        } catch (error) {
            console.log(error);
            return undefined;
        }
    }
       
    /**
     * Retrieves the Circle token amount for a given network estimate.
     *
     * @static
     * @method getCircleFromEstimate
     * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
     * @param {BridgeNetworks} network - The network for which to retrieve the Circle token amount.
     * @returns {Promise<BigNumber | undefined>} - A Promise that resolves to the Circle token amount as a BigNumber, or undefined if retrieval fails.
     */
    private static async getCircleFromEstimate(sdk: GlitterBridgeSDK,
        network: BridgeNetworks): Promise<BigNumber|undefined>{
        
        //Get gas token
        const gasToken = await sdk.gasToken(network);
        if (!gasToken) return undefined;
        const gasTokenChain = BridgeV2Tokens.getTokenConfigChild(gasToken, network)
        const gasTokenPrice = await TokenPricing.getPrice(gasToken?.asset_symbol || "");
        
        //Get From Gas Estimate      
        let gasPrice: {
                nativePrice: BigNumber;
                isFresh: boolean;
            };

        switch (network.toLocaleLowerCase()) {
            case BridgeNetworks.Ethereum.toLocaleLowerCase():
            case BridgeNetworks.Binance.toLocaleLowerCase():
            case BridgeNetworks.Polygon.toLocaleLowerCase():
            case BridgeNetworks.Avalanche.toLocaleLowerCase():
            case BridgeNetworks.Zkevm.toLocaleLowerCase():
            case BridgeNetworks.Arbitrum.toLocaleLowerCase():
            case BridgeNetworks.Optimism.toLocaleLowerCase():

                // eslint-disable-next-line no-case-declarations
                const circleDepositGasAggregatorMultiplier = 0.5; //Assumes circle bundles tranfers 2 at a time to conserve gas
                // eslint-disable-next-line no-case-declarations
                const circleDepositGasEstimate = new BigNumber(
                    66500 * circleDepositGasAggregatorMultiplier
                );

                gasPrice = await EVMGasPrice(sdk, network);

                // eslint-disable-next-line no-case-declarations              
                return gasPrice.nativePrice.times(circleDepositGasEstimate).times(gasTokenPrice.average_price).dividedBy(10 ** (gasTokenChain?.decimals || 0));

            case BridgeNetworks.algorand.toLocaleLowerCase():
                gasPrice = await AlgoGasPrice();
                return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            case BridgeNetworks.solana.toLocaleLowerCase():
                gasPrice = await SolanaGasPrice(sdk);
                return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            case BridgeNetworks.TRON.toLocaleLowerCase():
                gasPrice = await TronGasPrice(sdk);
                return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            default:
                return undefined;
        }

    }

    /**
     * Retrieves the Circle token amount for a given destination network estimate.
     *
     * @static
     * @method getCircleToEstimate
     * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
     * @param {BridgeNetworks} network - The destination network for which to retrieve the Circle token amount.
     * @returns {Promise<BigNumber | undefined>} - A Promise that resolves to the Circle token amount as a BigNumber, or undefined if retrieval fails.
     */
    private static async getCircleToEstimate(sdk: GlitterBridgeSDK,
        network: BridgeNetworks): Promise<BigNumber|undefined>{
        
        //Get gas token
        const gasToken = await sdk.gasToken(network);
        if (!gasToken) return undefined;
        const gasTokenChain = BridgeV2Tokens.getTokenConfigChild(gasToken, network)
        const gasTokenPrice = await TokenPricing.getPrice(gasToken?.asset_symbol || "");
        
        //Get From Gas Estimate      
        let gasPrice: {
                nativePrice: BigNumber;
                isFresh: boolean;
            };
        switch (network.toLocaleLowerCase()) {
            case BridgeNetworks.Ethereum.toLocaleLowerCase():
            case BridgeNetworks.Binance.toLocaleLowerCase():
            case BridgeNetworks.Polygon.toLocaleLowerCase():
            case BridgeNetworks.Avalanche.toLocaleLowerCase():
            case BridgeNetworks.Zkevm.toLocaleLowerCase():
            case BridgeNetworks.Arbitrum.toLocaleLowerCase():
            case BridgeNetworks.Optimism.toLocaleLowerCase():

                // eslint-disable-next-line no-case-declarations              
                const circleReleaseGasEstimate = new BigNumber(
                    66500 + 48500
                );
                gasPrice = await EVMGasPrice(sdk, network);

                // eslint-disable-next-line no-case-declarations              
                return gasPrice.nativePrice.times(circleReleaseGasEstimate).times(gasTokenPrice.average_price).dividedBy(10 ** (gasTokenChain?.decimals || 0));

            case BridgeNetworks.algorand.toLocaleLowerCase():
                gasPrice = await AlgoGasPrice();
                return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            case BridgeNetworks.solana.toLocaleLowerCase():
                gasPrice = await SolanaGasPrice(sdk);
                return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            case BridgeNetworks.TRON.toLocaleLowerCase():
                gasPrice = await TronGasPrice(sdk);
                return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            default:
                return undefined;
        }

    }

    /**
     * Retrieves the TokenV2 token amount for a given network estimate.
     *
     * @static
     * @method getTokenV2FromEstimate
     * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
     * @param {BridgeNetworks} network - The network for which to retrieve the TokenV2 token amount.
     * @returns {Promise<BigNumber | undefined>} - A Promise that resolves to the TokenV2 token amount as a BigNumber, or undefined if retrieval fails.
     */
    private static async getTokenV2FromEstimate(sdk: GlitterBridgeSDK,
        network: BridgeNetworks): Promise<BigNumber|undefined>{

        switch (network.toLocaleLowerCase()) {
            case BridgeNetworks.Ethereum.toLocaleLowerCase():
            case BridgeNetworks.Binance.toLocaleLowerCase():
            case BridgeNetworks.Polygon.toLocaleLowerCase():
            case BridgeNetworks.Avalanche.toLocaleLowerCase():
            case BridgeNetworks.Zkevm.toLocaleLowerCase():
            case BridgeNetworks.Arbitrum.toLocaleLowerCase():
            case BridgeNetworks.Optimism.toLocaleLowerCase():
                return new BigNumber(0);                                         
            default:               
                return undefined;
        }
    }

    /**
     * Retrieves the TokenV2 token amount for a given network estimate.
     *
     * @static
     * @method getTokenV2FromEstimate
     * @param {GlitterBridgeSDK} sdk - The GlitterBridgeSDK instance.
     * @param {BridgeNetworks} network - The network for which to retrieve the TokenV2 token amount.
     * @returns {Promise<BigNumber | undefined>} - A Promise that resolves to the TokenV2 token amount as a BigNumber, or undefined if retrieval fails.
     */
    private static async getTokenV2ToEstimate(sdk: GlitterBridgeSDK,
        network: BridgeNetworks): Promise<BigNumber|undefined>{
        
        //Get gas token
        const gasToken = await sdk.gasToken(network);
        if (!gasToken) return undefined;
        const gasTokenChain = BridgeV2Tokens.getTokenConfigChild(gasToken, network)
        const gasTokenPrice = await TokenPricing.getPrice(gasToken?.asset_symbol || "");
        
        //Get From Gas Estimate      
        let gasPrice: {
                nativePrice: BigNumber;
                isFresh: boolean;
            };
        switch (network.toLocaleLowerCase()) {
            case BridgeNetworks.Ethereum.toLocaleLowerCase():
            case BridgeNetworks.Binance.toLocaleLowerCase():
            case BridgeNetworks.Polygon.toLocaleLowerCase():
            case BridgeNetworks.Avalanche.toLocaleLowerCase():
            case BridgeNetworks.Zkevm.toLocaleLowerCase():
            case BridgeNetworks.Arbitrum.toLocaleLowerCase():
            case BridgeNetworks.Optimism.toLocaleLowerCase():

                // eslint-disable-next-line no-case-declarations              
                const circleReleaseGasEstimate = new BigNumber(
                    170000
                );
                gasPrice = await EVMGasPrice(sdk, network);

                // eslint-disable-next-line no-case-declarations              
                return gasPrice.nativePrice.times(circleReleaseGasEstimate).times(gasTokenPrice.average_price).dividedBy(10 ** (gasTokenChain?.decimals || 0));
           
            default:
                return undefined;
        }

    }
}