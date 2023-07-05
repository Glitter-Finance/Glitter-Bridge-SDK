import { TransferEvent, BridgeReleaseEvent, BridgeDepositEvent } from "@glitter-finance/sdk-core/dist";
import { ethers } from "ethers";

/**
 * Represents a group of USDC bridge events.
 *
 * @typedef {Object} USDCBridgeEventGroup
 * @property {BridgeDepositEvent} [deposit] - The bridge deposit event.
 * @property {BridgeReleaseEvent} [release] - The bridge release event.
 * @property {TransferEvent} [transfer] - The transfer event.
 */
export type USDCBridgeEventGroup = {
    deposit?: BridgeDepositEvent;
    release?: BridgeReleaseEvent;
    transfer?: TransferEvent;
}

/**
 * Parser for EVM bridge USDC events.
 */
export class EvmBridgeUSDCEventsParser {

    static readonly EventsABI = [
        "event BridgeDeposit(uint16 destinationChainId, uint256 amount, address token, bytes destinationWallet)",
        "event BridgeRelease(uint256 amount, address destinationWallet, address token, bytes32 depositTransactionHash)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];

    /**
     * Parses event logs.
     *
     * @param {ethers.providers.Log[]} eventLogs - The event logs to parse.
     * @returns {ethers.utils.LogDescription[]} An array of parsed event logs.
     */
    static parseLogs(eventLogs: ethers.providers.Log[]): ethers.utils.LogDescription[] {
        const bridgeContractinterface = new ethers.utils.Interface(EvmBridgeUSDCEventsParser.EventsABI);

        return eventLogs
            .map((log) => {
                try {
                    return bridgeContractinterface.parseLog(log);
                } catch (error) {
                    //console.log("[EvmBridgeEvents] Unable to parse event logs.", error);
                    return null;
                }
            })
            .filter((parsedLog) => !!parsedLog) as ethers.utils.LogDescription[];
    }

    /**
     * Parses a deposit event from parsed logs.
     *
     * @param {ethers.utils.LogDescription[]} parsedLogs - The parsed logs to search for a deposit event.
     * @returns {BridgeDepositEvent | null} The parsed deposit event, or null if not found.
     */
    static parseDeposit(parsedLogs: ethers.utils.LogDescription[]): BridgeDepositEvent | null {
        const parsedDeposit = parsedLogs.find((x) => x.name === "BridgeDeposit");

        if (!parsedDeposit) return null;
        const { destinationChainId, amount, token, destinationWallet } = parsedDeposit.args;

        return {
            destinationChainId,
            amount,
            erc20Address: token,
            destinationWallet,
            __type: "BridgeDeposit",
        };
    }

    /**
     * Parses a transfer event from parsed logs.
     *
     * @param {ethers.utils.LogDescription[]} parsedLogs - The parsed logs to search for a transfer event.
     * @returns {TransferEvent | null} The parsed transfer event, or null if not found.
     */
    static parseTransfer(parsedLogs: ethers.utils.LogDescription[]): TransferEvent | null {
        const parsedTransfer = parsedLogs.find((x) => x.name === "Transfer");

        if (!parsedTransfer) return null;
        const { from, to, value } = parsedTransfer.args;

        return {
            value,
            from,
            to,
            __type: "Transfer",
        };
    }

    /**
     * Parses a release event from parsed logs.
     *
     * @param {ethers.utils.LogDescription[]} parsedLogs - The parsed logs to search for a release event.
     * @returns {BridgeReleaseEvent | null} The parsed release event, or null if not found.
     */
    static parseRelease(parsedLogs: ethers.utils.LogDescription[]): BridgeReleaseEvent | null {
        const parsedRelease = parsedLogs.find((x) => x.name === "BridgeRelease");

        if (!parsedRelease) return null;
        const { amount, token, destinationWallet, depositTransactionHash } = parsedRelease.args;

        return {
            amount,
            erc20Address: token,
            destinationWallet,
            depositTransactionHash,
            __type: "BridgeRelease",
        };
    }
}