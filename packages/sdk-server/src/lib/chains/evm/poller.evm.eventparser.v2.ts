import { TransferEvent } from "@glitter-finance/sdk-core/dist";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";

/**
 * Represents a group of Token Bridge V2 events.
 *
 * @typedef {Object} TokenBridgeV2EventGroup
 * @property {TokenBridgeV2DepositEvent} [deposit] - The Token Bridge V2 deposit event.
 * @property {TokenBridgeV2ReleaseEvent} [release] - The Token Bridge V2 release event.
 * @property {TokenBridgeV2RefundEvent} [refund] - The Token Bridge V2 refund event.
 * @property {TransferEvent} [transfer] - The transfer event.
 */
export type TokenBridgeV2EventGroup = {
    deposit?: TokenBridgeV2DepositEvent;
    release?: TokenBridgeV2ReleaseEvent;
    refund?: TokenBridgeV2RefundEvent;
    transfer?: TransferEvent;
}

/**
 * Represents a Token Bridge V2 event.
 *
 * @typedef {Object} TokenBridgeV2Event
 * @property {BigNumber} nonce - The nonce of the event.
 * @property {string} vault - The vault associated with the event.
 * @property {BigNumber} amount - The amount associated with the event.
 * @property {string} destinationAddress - The destination address of the event.
 * @property {"BridgeDeposit" | "BridgeRelease" | "BridgeRefund"} type - The type of the event.
 */
export type TokenBridgeV2Event = {
    nonce: BigNumber;
    vault: string;
    amount: BigNumber;
    destinationAddress: string;
    type: "BridgeDeposit" | "BridgeRelease" | "BridgeRefund";
}

/**
 * Represents a Token Bridge V2 deposit event.
 *
 * @typedef {TokenBridgeV2Event & {
 *   destinationChainId: number;
 *   protocolId: number;
 * }} TokenBridgeV2DepositEvent
 */
export type TokenBridgeV2DepositEvent = TokenBridgeV2Event & {
    destinationChainId: number;
    protocolId: number;
}

/**
 * Represents a Token Bridge V2 release event.
 *
 * @typedef {TokenBridgeV2Event & {
 *   feeRate: number;
 *   depositId: string;
 * }} TokenBridgeV2ReleaseEvent
 */
export type TokenBridgeV2ReleaseEvent = TokenBridgeV2Event & {
    feeRate: number;
    depositId: string;
}

/**
 * Represents a Token Bridge V2 refund event.
 *
 * @typedef {TokenBridgeV2Event & {
 *   depositId: string;
 * }} TokenBridgeV2RefundEvent
 */
export type TokenBridgeV2RefundEvent = TokenBridgeV2Event & {
    depositId: string;
}

/**
 * Parser for EVM Bridge V2 events.
 */
export class EvmBridgeV2EventsParser {
    static readonly EventsABI_R0 = [
        "event BridgeDeposit(uint256 nonce, address vault, uint256 amount, uint16 destinationChainId, bytes destinationAddress, uint32 protocolId)",
        "event BridgeRelease(uint256 nonce, address vault, address destinationAddress, uint256 amount, uint8 feeRate,bytes32 depositId)",
        "event BridgeRefund(uint256 nonce, address vault, address destinationAddress, uint256 amount,bytes32 depositId)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];
    static readonly EventsABI_R1 = [
        "event BridgeDeposit(uint256 nonce, address vault, uint256 amount, uint16 destinationChainId, bytes destinationAddress, uint32 protocolId)",
        "event BridgeRelease(uint256 nonce, address vault, address destinationAddress, uint256 amount, uint16 feeRate,bytes32 depositId)",
        "event BridgeRefund(uint256 nonce, address vault, address destinationAddress, uint256 amount,bytes32 depositId)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];

    /**
     * Parses event logs into log descriptions.
     *
     * @param {ethers.providers.Log[]} eventLogs - The event logs to parse.
     * @returns {ethers.utils.LogDescription[]} The parsed log descriptions.
     */
    static parseLogs(eventLogs: ethers.providers.Log[]): ethers.utils.LogDescription[] {

        const bridgeContractinterface1 = new ethers.utils.Interface(EvmBridgeV2EventsParser.EventsABI_R0);
        const bridgeContractinterface2 = new ethers.utils.Interface(EvmBridgeV2EventsParser.EventsABI_R1);

        //parse interface 1
        let parsedLogs1 = undefined;
        try {
            parsedLogs1 = eventLogs
                .map((log) => {
                    try {
                        return bridgeContractinterface1.parseLog(log);
                    } catch (error) {
                        //console.log("[EvmBridgeEvents] Unable to parse event logs.", error);
                        return null;
                    }
                })
                .filter((parsedLog) => !!parsedLog) as ethers.utils.LogDescription[];
        } catch (error) {
        }

        //parse interface 2
        let parsedLogs2 = undefined;
        try {
            parsedLogs2 = eventLogs
                .map((log) => {
                    try {
                        return bridgeContractinterface2.parseLog(log);
                    } catch (error) {
                        //console.log("[EvmBridgeEvents] Unable to parse event logs.", error);
                        return null;
                    }
                })
                .filter((parsedLog) => !!parsedLog) as ethers.utils.LogDescription[];
        } catch (error) {
        }

        if (!parsedLogs1 && !parsedLogs2) throw Error("Unable to parse event logs.");
        if (!parsedLogs1 && parsedLogs2) return parsedLogs2;
        if (!parsedLogs2 && parsedLogs1) return parsedLogs1;

        if ((parsedLogs1 && parsedLogs2) && parsedLogs1.length > parsedLogs2?.length) return parsedLogs1;
        if (parsedLogs2) return parsedLogs2;
        throw Error("Unable to parse event logs.");

    }

    /**
     * Parses parsed logs into a Token Bridge V2 deposit event.
     *
     * @param {ethers.utils.LogDescription[]} parsedLogs - The parsed logs to parse.
     * @returns {TokenBridgeV2DepositEvent | null} The parsed Token Bridge V2 deposit event, or null if parsing fails.
     */
    static parseDeposit(parsedLogs: ethers.utils.LogDescription[]): TokenBridgeV2DepositEvent | null {
        const parsedDeposit = parsedLogs.find((x) => x.name === "BridgeDeposit");

        if (!parsedDeposit) return null;
        const { nonce, vault, amount, destinationChainId, destinationAddress, protocolId } = parsedDeposit.args;

        return {
            nonce,
            vault,
            amount,
            destinationChainId,
            destinationAddress,
            type: "BridgeDeposit",
            protocolId,
        };
    }

    /**
     * Parses a release event from parsed logs.
     *
     * @param {ethers.utils.LogDescription[]} parsedLogs - An array of parsed logs.
     * @returns {TokenBridgeV2ReleaseEvent | null} The parsed TokenBridgeV2ReleaseEvent or null if not found.
     */
    static parseRelease(parsedLogs: ethers.utils.LogDescription[]): TokenBridgeV2ReleaseEvent | null {
        const parsedRelease = parsedLogs.find((x) => x.name === "BridgeRelease");

        if (!parsedRelease) return null;
        const { nonce, vault, destinationAddress, amount, feeRate, depositId } = parsedRelease.args;

        return {
            nonce,
            vault,
            amount,
            destinationAddress,
            type: "BridgeRelease",
            feeRate,
            depositId,
        };
    }

    /**
     * Parses a refund event from parsed logs.
     *
     * @param {ethers.utils.LogDescription[]} parsedLogs - An array of parsed logs.
     * @returns {TokenBridgeV2RefundEvent | null} The parsed TokenBridgeV2RefundEvent or null if not found.
     */
    static parseRefund(parsedLogs: ethers.utils.LogDescription[]): TokenBridgeV2RefundEvent | null {
        const parsedRefund = parsedLogs.find((x) => x.name === "BridgeRefund");

        if (!parsedRefund) return null;
        const { nonce, vault, destinationAddress, amount, depositId } = parsedRefund.args;

        return {
            nonce,
            vault,
            amount,
            destinationAddress,
            type: "BridgeRefund",
            depositId
        };
    }

    /**
     * Parses a transfer event from parsed logs.
     *
     * @param {ethers.utils.LogDescription[]} parsedLogs - An array of parsed logs.
     * @returns {TransferEvent | null} The parsed TransferEvent or null if not found.
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
}
