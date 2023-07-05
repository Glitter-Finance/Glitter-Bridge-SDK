import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { fromHexString } from "../../common/utils/bytes";
import algoSdk from "algosdk";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
    getNetworkByNumericId,
    getNumericNetworkId,
} from "../../common/networks";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TronWeb = require("tronweb");

/**
 * Class for serializing EVM bridge transfers.
 */
export class SerializeEvmBridgeTransfer {
    
    /**
     * Serializes an address based on the source chain and address value.
     *
     * @static
     * @param {BridgeNetworks | BridgeEvmNetworks} sourceChain - The source chain for the address serialization.
     * @param {string} address - The address value to serialize.
     * @returns {string} - The serialized address.
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
            case BridgeNetworks.Binance:
            case BridgeNetworks.Arbitrum:
            case BridgeNetworks.Zkevm:
            case BridgeNetworks.Optimism:
                return address;
            case BridgeNetworks.algorand:
                return ethers.utils.hexZeroPad(algoSdk.decodeAddress(address).publicKey, 32).toString();
        }
    }

    /**
     * Serializes the EVM bridge transfer information.
     *
     * @static
     * @param {BridgeEvmNetworks} sourceChain - The source EVM network.
     * @param {BridgeNetworks} destinationChain - The destination bridge network.
     * @param {string} sourceWallet - The source wallet address.
     * @param {string} destinationWallet - The destination wallet address.
     * @param {ethers.BigNumber} amount - The amount of the transfer.
     * @returns {{ sourceChain: number, destinationChain: number, sourceWallet: string, destinationWallet: string, amount: string }} - The serialized EVM bridge transfer information.
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

/**
 * Class for deserializing EVM bridge transfers.
 */
export class DeserializeEvmBridgeTransfer {
    
    /**
     * Deserializes an address based on the chain and data value.
     *
     * @static
     * @param {BridgeNetworks} chain - The chain for the address deserialization.
     * @param {string} data - The serialized address data.
     * @returns {string} - The deserialized address.
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
            case BridgeNetworks.Binance:
            case BridgeNetworks.Arbitrum:
            case BridgeNetworks.Zkevm:
            case BridgeNetworks.Optimism:
                return `${data.toLowerCase()}`;
            case BridgeNetworks.solana:
                return new PublicKey(fromHexString(data) as Uint8Array).toString();
        }
    }

    /**
     * Deserializes the EVM bridge transfer information.
     *
     * @static
     * @param {number} sourceChainId - The source chain ID.
     * @param {number} destinationChainId - The destination chain ID.
     * @param {string} sourceWallet - The source wallet address.
     * @param {string} destinationIdBytes - The serialized destination wallet address.
     * @param {ethers.BigNumber} amount - The amount of the transfer.
     * @returns {{ sourceNetwork: BridgeEvmNetworks, destinationNetwork: BridgeNetworks, sourceWallet: string, destinationWallet: string, amount: ethers.BigNumber, }} - The deserialized EVM bridge transfer information.
     */
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
