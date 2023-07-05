import { ethers } from "ethers";
import { AbiCoder } from "ethers/lib/utils";
import { isArray } from "util";
import { BridgeDepositEvent, BridgeReleaseEvent, TransferEvent } from "../evm";
import { EventTopics } from "./types";

const BRIDGE_RELEASE_EVENT_SIGNATURE = (trWeb: any): string =>
    trWeb.sha3("BridgeRelease(uint256,address,address,bytes32)");
const TRC20_TRANSFER_EVENT_SIGNATURE = (trWeb: any): string => trWeb.sha3("Transfer(address,address,uint256)");

/**
 * Retrieves a log from an array of logs based on the event signature.
 *
 * @function getLogByEventSignature
 * @param {any} trWeb - The TronWeb instance.
 * @param {Array<{ data: string, topics: string[] }>} logs - The array of logs to search.
 * @param {EventTopics} topic - The event signature to match.
 * @returns {{ data: string, topics: string[] } | null} - The matched log object, or null if no match is found.
 */
export function getLogByEventSignature(
    trWeb: any,
    logs: Array<{
        data: string;
        topics: string[];
    }>,
    topic: EventTopics
): {
    data: string;
    topics: string[];
} | null {
    if (logs.length === 0) return null;

    const signature =
        topic === "BridgeRelease" ? BRIDGE_RELEASE_EVENT_SIGNATURE(trWeb) : TRC20_TRANSFER_EVENT_SIGNATURE(trWeb);

    if (!logs || (logs && !isArray(logs))) {
        return null;
    }

    const matchingLog = logs.find((x) => `0x${x.topics[0].toLowerCase()}` === signature.toLowerCase());

    if (!matchingLog) return null;
    return matchingLog;
}

/**
 * Decodes event data based on the event log and event topic.
 *
 * @function decodeEventData
 * @param {{ data: string, topics: string[] }} log - The event log containing data to decode.
 * @param {EventTopics} topic - The event topic to determine the type of event.
 * @returns {BridgeDepositEvent | BridgeReleaseEvent | TransferEvent | null} - The decoded event object, or null if decoding fails.
 */
export function decodeEventData(
    log: { data: string; topics: string[] },
    topic: EventTopics
): BridgeDepositEvent | BridgeReleaseEvent | TransferEvent | null {
    const coder = new AbiCoder();
    switch (topic) {
        case "BridgeRelease":
            {
                const decodedRelease = coder.decode(
                    ["address", "address", "uint256", "bytes32"],
                    !log.data.startsWith("0x") ? `0x${log.data}` : log.data
                );
                if (decodedRelease.length > 0) {
                    const bridgeRelease: BridgeReleaseEvent = {
                        amount: ethers.BigNumber.from(decodedRelease[0].toString()),
                        depositTransactionHash: decodedRelease[3],
                        destinationWallet: decodedRelease[1],
                        erc20Address: decodedRelease[2],
                        __type: "BridgeRelease",
                    };
                    return bridgeRelease;
                }
            }
            break;
        case "Transfer": {
            const decodedTransfer = coder.decode(["uint256"], !log.data.startsWith("0x") ? `0x${log.data}` : log.data);
            const from = "41" + log.topics[1].substring(24);
            const to = "41" + log.topics[2].substring(24);
            if (decodedTransfer.length > 0) {
                const transfer: TransferEvent = {
                    from,
                    to,
                    value: ethers.BigNumber.from(decodedTransfer[0].toString()),
                    __type: "Transfer",
                };
                return transfer;
            }
            break;
        }
    }

    return null;
}

/**
 * Converts a hexadecimal string to an array of bytes.
 *
 * @function hexToBytes
 * @param {string} hex - The hexadecimal string to convert.
 * @returns {number[]} - An array of bytes representing the converted hexadecimal string.
 */
export function hexToBytes(hex: string): number[] {
    const bytes: number[] = [];
    for (let c = 0; c < hex.length; c += 2) bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}
