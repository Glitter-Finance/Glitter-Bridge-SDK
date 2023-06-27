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

    private static FAIL_MAX = new BigNumber(1000000000000000);
    private static FAIL_RETURN = {
        usd: this.FAIL_MAX.toNumber(),
    };

    public static async estimateGasPrice(
        sdk: GlitterBridgeSDK,
        from: string,
        to: string,
        type: BridgeType
    ): Promise<GasEstimate> {

        //Validate Params
        if (!from) return this.FAIL_RETURN;        
        if (!to) return this.FAIL_RETURN;

        //Iterate through BridgeNetwork enum to get from network
        let fromNetwork: BridgeNetworks | undefined = undefined;
        for (const network in BridgeNetworks) {
            if (network.toLocaleLowerCase() === from.toLocaleLowerCase()) {
                fromNetwork = network as BridgeNetworks;
                break;
            }
        }
        if (!fromNetwork) return this.FAIL_RETURN;

        //Iterate through BridgeNetwork enum to get to network
        let toNetwork: BridgeNetworks | undefined = undefined;
        for (const network in BridgeNetworks) {
            if (network.toLocaleLowerCase() === to.toLocaleLowerCase()) {
                toNetwork = network as BridgeNetworks;
                break;
            }
        }      
        if (!toNetwork) return this.FAIL_RETURN;

        switch (type) {
            case BridgeType.Circle:
                return await this.estimateCircleGasPrice(sdk, fromNetwork, toNetwork);
            case BridgeType.TokenV2:
                return await this.estimateTokenV2GasPrice(sdk, fromNetwork, toNetwork);
            default:
                throw new Error("Invalid bridge type");
        }

    }

    private static async estimateCircleGasPrice(
        sdk: GlitterBridgeSDK,
        fromNetwork: BridgeNetworks,
        toNetwork: BridgeNetworks): Promise<GasEstimate> {

        try {
           
            const fromGasPrice = await this.getFromEstimate(sdk, fromNetwork);
            const toGasPrice = await this.getToEstimate(sdk, toNetwork);

            return {
                usd: fromGasPrice.plus(toGasPrice).toNumber(),
                deposit: fromGasPrice.toNumber(),
                release: toGasPrice.toNumber(),
            }

        } catch (error) {
            console.log(error);
            return this.FAIL_RETURN;
        }
    }
    private static async estimateTokenV2GasPrice(
        sdk: GlitterBridgeSDK,
        fromNetwork: BridgeNetworks,
        toNetwork: BridgeNetworks): Promise<GasEstimate> {

        try {
           
            const fromGasPrice = await this.getFromEstimate(sdk, fromNetwork);
            const toGasPrice = await this.getToEstimate(sdk, toNetwork);

            return {
                usd: fromGasPrice.plus(toGasPrice).toNumber(),
                deposit: fromGasPrice.toNumber(),
                release: toGasPrice.toNumber(),
            }

        } catch (error) {
            console.log(error);
            return this.FAIL_RETURN;
        }
    }
       
    private static async getFromEstimate(sdk: GlitterBridgeSDK,
        network: BridgeNetworks): Promise<BigNumber>{
        
        //Get gas token
        const gasToken = await sdk.gasToken(network);
        if (!gasToken) return this.FAIL_MAX;
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
                return this.FAIL_MAX;
        }

    }
    private static async getToEstimate(sdk: GlitterBridgeSDK,
        network: BridgeNetworks): Promise<BigNumber>{
        
        //Get gas token
        const gasToken = await sdk.gasToken(network);
        if (!gasToken) return this.FAIL_MAX;
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
                return this.FAIL_MAX;
        }

    }
}