import BigNumber from "bignumber.js";
import { BridgeType } from "../transactions";
import { BridgeEvmNetworks, BridgeNetworks } from "../networks";
import { GlitterBridgeSDK } from "../../../GlitterBridgeSDK";
import { BridgeV2Tokens } from "../tokens";
import { TokenPricing } from "../pricing";
import { AlgoGasPrice, EVMGasPrice, SolanaGasPrice, TronGasPrice } from "./gasPriceByChain";

export type GasEstimate = {
    usd: number;
    deposit?: number;
    release?: number;
}

export type GasUsedEstimate = {
    source: BigNumber;
    destination: BigNumber;
}

export class GasEstimator {

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
                gasPrice = await AlgoGasPrice(sdk);
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
                gasPrice = await AlgoGasPrice(sdk);
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

            // case BridgeNetworks.algorand.toLocaleLowerCase():
            //     gasPrice = await AlgoGasPrice(sdk);
            //     return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            // case BridgeNetworks.solana.toLocaleLowerCase():
            //     gasPrice = await SolanaGasPrice(sdk);
            //     return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            // case BridgeNetworks.TRON.toLocaleLowerCase():
            //     gasPrice = await TronGasPrice(sdk);
            //     return gasPrice.nativePrice.times(gasTokenPrice.average_price);
            default:
                return undefined;
        }

    }
}