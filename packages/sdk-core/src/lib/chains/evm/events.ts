import {ethers} from "ethers";
import {BridgeDepositEvent, BridgeReleaseEvent, TransferEvent} from "./types";

export class EvmBridgeEventsParser {
    static readonly EventsABI = [
        "event BridgeDeposit(uint16 destinationChainId, uint256 amount, address token, bytes destinationWallet)",
        "event BridgeRelease(uint256 amount, address destinationWallet, address token, bytes32 depositTransactionHash)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];

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

    parseDeposit(logs: ethers.providers.Log[]): BridgeDepositEvent | null {
        const parsedLogs = this.parseLogs(logs);
        const parsedDeposit = parsedLogs.find((x) => x.name === "BridgeDeposit");

        if (!parsedDeposit) return null;
        const {destinationChainId, amount, token, destinationWallet} = parsedDeposit.args;

        return {
            destinationChainId,
            amount,
            erc20Address: token,
            destinationWallet,
            __type: "BridgeDeposit",
        };
    }

    parseTransfer(logs: ethers.providers.Log[]): TransferEvent | null {
        const parsedLogs = this.parseLogs(logs);
        const parsedTransfer = parsedLogs.find((x) => x.name === "Transfer");

        if (!parsedTransfer) return null;
        const {from, to, value} = parsedTransfer.args;

        return {
            value,
            from,
            to,
            __type: "Transfer",
        };
    }

    parseRelease(logs: ethers.providers.Log[]): BridgeReleaseEvent | null {
        const parsedLogs = this.parseLogs(logs);
        const parsedRelease = parsedLogs.find((x) => x.name === "BridgeRelease");

        if (!parsedRelease) return null;
        const {amount, token, destinationWallet, depositTransactionHash} = parsedRelease.args;

        return {
            amount,
            erc20Address: token,
            destinationWallet,
            depositTransactionHash,
            __type: "BridgeRelease",
        };
    }
}
