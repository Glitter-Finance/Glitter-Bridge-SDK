import base58 from "bs58";
import { ethers } from "ethers";
import { BridgeNetworks } from "../networks";
import { base64ToString } from "./utils";

export function getHashedTransactionId(
    sourceNetwork: BridgeNetworks,
    hash: string
): string {
    const base64String = base64ToString(hash);
    switch (sourceNetwork) {
        case BridgeNetworks.solana:
            return ethers.utils.keccak256(base58.decode(hash));
        case BridgeNetworks.algorand:            
            //return ethers.utils.keccak256(`0x${base64String}`);
            //Below is the correct way to do it
            return ethers.utils.keccak256('0x' + Buffer.from(hash, "base64").toString("hex"));
        case BridgeNetworks.TRON:
            return ethers.utils.keccak256(`0x${hash}`);
        default:
            return ethers.utils.keccak256(hash);
    }
}