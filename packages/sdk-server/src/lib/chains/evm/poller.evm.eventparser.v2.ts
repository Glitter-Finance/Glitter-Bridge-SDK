import { TransferEvent } from "@glitter-finance/sdk-core/dist";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";

export type TokenBridgeV2EventGroup = {
    deposit?: TokenBridgeV2DepositEvent;
    release?: TokenBridgeV2ReleaseEvent;
    refund?: TokenBridgeV2RefundEvent;
    transfer?: TransferEvent;
}
export type TokenBridgeV2Event = {
    vaultId: number;
    amount: BigNumber;
    destinationAddress: string;
    type: "BridgeDeposit" | "BridgeRelease" | "BridgeRefund";
}
export type TokenBridgeV2DepositEvent = TokenBridgeV2Event & {
    destinationChainId: number;
}
export type TokenBridgeV2ReleaseEvent = TokenBridgeV2Event & {
    feeRate: number;
    depositId: string;
}
export type TokenBridgeV2RefundEvent = TokenBridgeV2Event & {
    depositId: string;
}

export class EvmBridgeV2EventsParser {
    static readonly EventsABI = [
        "event BridgeDeposit(uint32 vaultId, uint256 amount, uint16 destinationChainId, bytes destinationAddress)",
        "event BridgeRelease(uint32 vaultId, address destinationAddress, uint256 amount, uint8 feeRate,bytes32 depositId)",
        "event BridgeRefund(uint32 vaultId, address destinationAddress, uint256 amount)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];

    static parseLogs(eventLogs: ethers.providers.Log[]): ethers.utils.LogDescription[] {
        const bridgeContractinterface = new ethers.utils.Interface(EvmBridgeV2EventsParser.EventsABI);

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

    static parseDeposit(parsedLogs: ethers.utils.LogDescription[]): TokenBridgeV2DepositEvent | null {
        const parsedDeposit = parsedLogs.find((x) => x.name === "BridgeDeposit");

        if (!parsedDeposit) return null;
        const { vaultId, amount, destinationChainId, destinationAddress } = parsedDeposit.args;

        return {
            vaultId,
            amount,
            destinationChainId,
            destinationAddress,
            type: "BridgeDeposit",
        };
    }   

    static parseRelease(parsedLogs: ethers.utils.LogDescription[]): TokenBridgeV2ReleaseEvent | null {
        const parsedRelease = parsedLogs.find((x) => x.name === "BridgeRelease");

        if (!parsedRelease) return null;
        const { vaultId, destinationAddress, amount, feeRate, depositId } = parsedRelease.args;

        return {
            vaultId,
            amount,
            destinationAddress,
            type: "BridgeRelease",
            feeRate,
            depositId,
        };
    }

    static parseRefund(parsedLogs: ethers.utils.LogDescription[]): TokenBridgeV2RefundEvent | null {
        const parsedRefund = parsedLogs.find((x) => x.name === "BridgeRefund");

        if (!parsedRefund) return null;
        const { vaultId, destinationAddress, amount } = parsedRefund.args;

        return {
            vaultId,
            amount,
            destinationAddress,
            type: "BridgeRefund",
            depositId: ""
        };
    }

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
