import { ethers } from "ethers";
import { BridgeDepositEvent, BridgeReleaseEvent, TransferEvent } from "./types";

/**
 * Class for parsing EVM bridge events.
 */
export class EvmBridgeEventsParser {
    static readonly EventsABI = [
        "event BridgeDeposit(uint16 destinationChainId, uint256 amount, address token, bytes destinationWallet)",
        "event BridgeRelease(uint256 amount, address destinationWallet, address token, bytes32 depositTransactionHash)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];

    /**
     * Parses the given event logs and returns an array of log descriptions.
     *
     * @private
     * @param {ethers.providers.Log[]} eventLogs - The event logs to parse.
     * @returns {ethers.utils.LogDescription[]} - An array of parsed log descriptions.
     */
    private parseLogs(eventLogs: ethers.providers.Log[]): ethers.utils.LogDescription[] {
        const bridgeContractinterface = new ethers.utils.Interface(EvmBridgeEventsParser.EventsABI);

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
     * Parses the given logs to extract a BridgeDepositEvent object.
     *
     * @param {ethers.providers.Log[]} logs - The logs to parse.
     * @returns {BridgeDepositEvent | null} - The parsed BridgeDepositEvent object, or null if not found.
     */
    parseDeposit(logs: ethers.providers.Log[]): BridgeDepositEvent | null {
        const parsedLogs = this.parseLogs(logs);
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
     * Parses the given logs to extract a TransferEvent object.
     *
     * @param {ethers.providers.Log[]} logs - The logs to parse.
     * @returns {TransferEvent | null} - The parsed TransferEvent object, or null if not found.
     */
    parseTransfer(logs: ethers.providers.Log[]): TransferEvent | null {
        const parsedLogs = this.parseLogs(logs);
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
     * Parses the given logs to extract a BridgeReleaseEvent object.
     *
     * @param {ethers.providers.Log[]} logs - The logs to parse.
     * @returns {BridgeReleaseEvent | null} - The parsed BridgeReleaseEvent object, or null if not found.
     */
    parseRelease(logs: ethers.providers.Log[]): BridgeReleaseEvent | null {
        const parsedLogs = this.parseLogs(logs);
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
