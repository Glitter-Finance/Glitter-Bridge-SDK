import BigNumber from "bignumber.js";
import { GlitterBridgeSDK } from "../../../GlitterBridgeSDK";
import { BridgeEvmNetworks, BridgeNetworks } from "../networks";
import { bridgeUSDC } from "../../../lib/chains/solana/transactions";
import { BridgeTokens } from "../tokens";
import { PublicKey } from "@solana/web3.js";
import { getHashedTransactionId } from "../utils";
import { RoutingHelper } from "../routing";
import { TronResources, getTRXBurnByEnergy, tronEstimateReleaseTxEnergy } from "./gasPrice_Tron";

const gas_cache: {
    [network: string]: {
        nativePrice: BigNumber;
        updatedAt: number;
    };
} = {};

const cache_duration = 1000 * 60 * 0.5; // 5 mins

export async function EVMGasPrice(sdk: GlitterBridgeSDK, network: BridgeNetworks): Promise<{
    nativePrice: BigNumber;
    isFresh: boolean;
}> {      
   
    //Check if the cache is still valid
    const current = new Date().getTime();
    if (gas_cache[network]) {
        if (gas_cache[network].updatedAt + cache_duration >= current) {
            return {
                nativePrice: gas_cache[network].nativePrice,
                isFresh: false
            }
        }
    }
   
    //Get New Price
    const connect = sdk.getEvmNetwork(network as BridgeEvmNetworks);
    if (!connect) throw new Error(`Failed to get EVM network ${network}`);

    const price = await connect.provider.getGasPrice();
    const return_price = BigNumber(price.toString());

    //Update Cache
    gas_cache[network] = {
        nativePrice: return_price,
        updatedAt: current,
    };

    return {
        nativePrice: return_price,
        isFresh: true
    };
}
export async function AlgoGasPrice(sdk: GlitterBridgeSDK): Promise<{
    nativePrice: BigNumber;
    isFresh: boolean;
}> {      
    return {
        nativePrice: new BigNumber(0.001),
        isFresh: true
    };        
}
export async function SolanaGasPrice(sdk: GlitterBridgeSDK):Promise<{
    nativePrice: BigNumber;
    isFresh: boolean;
}> {      
    const network = BridgeNetworks.solana;
    
    //Check if the cache is still valid
    const current = new Date().getTime();
    if (gas_cache[network]) {
        if (gas_cache[network].updatedAt + cache_duration >= current) {
            return {
                nativePrice: gas_cache[network].nativePrice,
                isFresh: false
            }
        }
    }
    
    //Get New Price
    const connect = sdk.solana?.connections[sdk.solana?.defaultConnection];
    if (!connect) throw new Error(`Failed to get Solana network`);

    //Get USDC Token
    const token = BridgeTokens.getToken(BridgeNetworks.solana, "usdc");

    //Get solana bridge txn
    const txn = await bridgeUSDC(
        connect,
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        BridgeNetworks.algorand,
        new BigNumber(1),
        sdk.solana.solanaConfig.accounts,
        token
    )
    txn.recentBlockhash = (await connect.getLatestBlockhash()).blockhash;
    txn.feePayer = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");    
    const fee = await txn.getEstimatedFee(connect);

    // Convert lamports to SOL
    const solGasPrice = new BigNumber((fee||0) / Math.pow(10, 9));

    //Update Cache
    gas_cache[network] = {
        nativePrice: solGasPrice,
        updatedAt: current,
    };

    return {
        nativePrice: solGasPrice,
        isFresh: true
    };
        
}

export async function TronGasPrice(sdk: GlitterBridgeSDK):Promise<{
    nativePrice: BigNumber;
    isFresh: boolean;
}> {  

    const network = BridgeNetworks.TRON;
    
    //Check if the cache is still valid
    const current = new Date().getTime();
    if (gas_cache[network]) {
        if (gas_cache[network].updatedAt + cache_duration >= current) {
            return {
                nativePrice: gas_cache[network].nativePrice,
                isFresh: false
            }
        }
    }

    //Get Fresh Price
    const tronConnect = sdk.tron
    if (!tronConnect) throw new Error(`Failed to get Tron network`);
    const tronWeb = tronConnect.tronWeb;
    const releaseAccount = tronConnect.getAddress("releaseWallet");

    const resources: TronResources = await tronWeb.trx.getAccountResources(releaseAccount)

    const chainParams: Array<{ key: string; value: number }> = await tronWeb.trx.getChainParameters()
    // https://github.com/TRON-US/tronstation-sdk/blob/0601fd282f8f0cedcf6af8694865a56d26647f05/src/utils/Apis.js#L111
    // https://github.com/TRON-US/tronstation-sdk/blob/0601fd282f8f0cedcf6af8694865a56d26647f05/src/lib/Energy.js#L36
    // const trx2BurnedEnergy = chainParams.find(x => x.key === "getEnergyFee")
    if (!('EnergyLimit' in resources) && !('EnergyUsed' in resources)
                && !('NetLimit' in resources) && !('NetUsed' in resources)
                && !('freeNetLimit' in resources) && !('freeNetUsed' in resources)
    ) {
        throw new Error(
            '[TronReleaseHandler] Unable to retrieve account resources'
        )
    }

    //Get available energy
    const availableEnergy = resources.EnergyLimit - (resources.EnergyUsed || 0)
    const triggerConstantContractResult = await tronEstimateReleaseTxEnergy(
        tronWeb,
        tronConnect.getAddress("bridge"),
        new BigNumber(1), // add amount
        "TYsvgn3yjTQSWMwfsCN4mygYvozJGo8xBC",
        tronConnect.getAddress("tokens", "USDC"),
        getHashedTransactionId(BridgeNetworks.Ethereum, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
        releaseAccount
    )

    //Get available bandwidth
    const availableBandwidth = (resources.NetLimit - (resources.NetUsed|| 0)) + (resources.freeNetLimit - (resources.freeNetUsed || 0))
    if (triggerConstantContractResult === null || !triggerConstantContractResult.result.result) {
        throw new Error('[TronReleaseHandler] TronEnergyEstimation Error triggerConstantContractResult unavailable')
    }

    //Check if we need to burn TRX for energy or bandwidth
    const trxShouldbeBurnedForEnergy = (triggerConstantContractResult.energy_used ||0)> availableEnergy
    const trxShouldbeBurnedForBandwidth = 411 > availableBandwidth

    let neededEnergy = new BigNumber(0)
    let neededBandwidth = new BigNumber(0)
    let trxToBeBurned: BigNumber = new BigNumber(0)

    if (trxShouldbeBurnedForEnergy) {
        neededEnergy = new BigNumber(Math.abs((triggerConstantContractResult.energy_used||0) - availableEnergy))
        trxToBeBurned = await getTRXBurnByEnergy(chainParams, neededEnergy)
    }

    if (trxShouldbeBurnedForBandwidth) {
        // https://developers.tron.network/docs/resource-model
        // Burned TRX =  the amount of bandwidth consumed * the unit price of bandwidth
        // Currently, the unit price of bandwidth is 1000sun.
        neededBandwidth = new BigNumber(Math.abs(411 - availableBandwidth))
        trxToBeBurned = RoutingHelper.BaseUnits_FromReadableValue(new BigNumber(1000).times(neededBandwidth).toNumber(), 6)
            
    }

    //Update Cache
    gas_cache[network] = {
        nativePrice: trxToBeBurned,
        updatedAt: current,
    };

    return {
        nativePrice: trxToBeBurned,
        isFresh: true
    };
    
}
