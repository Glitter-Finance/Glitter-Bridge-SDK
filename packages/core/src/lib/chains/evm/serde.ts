import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import TronWeb from "tronweb";
import { fromHexString } from "../../common/utils/bytes";
import algoSdk from "algosdk";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
    getNetworkByNumericId,
    getNumericNetworkId,
} from "../../common/networks/networks";

export class SerializeEvmBridgeTransfer {
    /**
     * Convert encoded addresses to bytes
     * @param {Network} sourceChain
     * @param {string | algoSdk.Account | PublicKey} address
     * @returns hex string
     */
    static serializeAddress(sourceChain: BridgeNetworks | BridgeEvmNetworks, address: string): string {
        switch (sourceChain) {
            case BridgeNetworks.TRON:
                // Omit 41 and add 0x
                return `0x${TronWeb.address.toHex(address).slice(2)}`;
            case BridgeNetworks.solana:
                return ethers.utils.hexZeroPad(new PublicKey(address).toBytes(), 32).toString();
            case BridgeNetworks.Polygon:
            case BridgeNetworks.Avalanche:
            case BridgeNetworks.Ethereum:
                return address;
            case BridgeNetworks.algorand:
                return ethers.utils.hexZeroPad(algoSdk.decodeAddress(address).publicKey, 32).toString();
        }
    }
    /**
     * Serialize bridge transfer parameters
     * @param {BridgeEvmNetworks} sourceChain
     * @param {BridgeEvmNetworks | BridgeNetworks} destinationChain
     * @param {string} sourceWallet
     * @param {PublicKey | algoSdk.Account | string} destinationWallet
     * @param {ethers.BigNumber} amount
     * @returns Serialized transfer
     */
    static serialize(
        sourceChain: BridgeEvmNetworks,
        destinationChain: BridgeNetworks,
        sourceWallet: string,
        destinationWallet: string,
        amount: ethers.BigNumber
    ): {
        sourceChain: number;
        destinationChain: number;
        sourceWallet: string;
        destinationWallet: string;
        amount: string;
    } {
        const _sourceChain = getNumericNetworkId(sourceChain);
        const _destinationChain = getNumericNetworkId(destinationChain);

        return {
            sourceChain: _sourceChain,
            destinationChain: _destinationChain,
            destinationWallet: SerializeEvmBridgeTransfer.serializeAddress(
                getNetworkByNumericId(_destinationChain),
                destinationWallet
            ),
            sourceWallet,
            amount: amount.toString(),
        };
    }
}

export class DeserializeEvmBridgeTransfer {
    /**
     * Deserialize address from bytes
     * @param {Network} sourceChain
     * @param {string} address
     * @returns {string} formatted address
     */
    static deserializeAddress(chain: BridgeNetworks, data: string): string {
        switch (chain) {
            case BridgeNetworks.TRON:
                return TronWeb.address.fromHex("0x" + data);
            case BridgeNetworks.algorand:
                return algoSdk.encodeAddress(fromHexString(data));
            case BridgeNetworks.Polygon:
            case BridgeNetworks.Avalanche:
            case BridgeNetworks.Ethereum:
                return `0x${data.toLowerCase()}`;
            case BridgeNetworks.solana:
                return new PublicKey(fromHexString(data) as Uint8Array).toString();
        }
    }

    static deserialize(
        sourceChainId: number,
        destinationChainId: number,
        sourceWallet: string,
        destinationIdBytes: string,
        amount: ethers.BigNumber
    ): {
        sourceNetwork: BridgeEvmNetworks;
        destinationNetwork: BridgeNetworks;
        sourceWallet: string;
        destinationWallet: string;
        amount: ethers.BigNumber;
    } {
        return {
            sourceNetwork: getNetworkByNumericId(sourceChainId) as BridgeEvmNetworks,
            destinationNetwork: getNetworkByNumericId(destinationChainId),
            amount,
            sourceWallet,
            destinationWallet: DeserializeEvmBridgeTransfer.deserializeAddress(
                getNetworkByNumericId(destinationChainId),
                // omit '0x'
                destinationIdBytes.slice(2)
            ),
        };
    }
}
