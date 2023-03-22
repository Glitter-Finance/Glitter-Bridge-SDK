import { TokenConfig } from "../evm";

export type TronConfig = {
    fullNode: string;
    solidityNode: string;
    eventServer: string;
    addresses: {
        bridge: string;
        depositWallet: string;
        releaseWallet: string;
    };
    tokens: TokenConfig[];
};

export type EventTopics = "BridgeRelease" | "Transfer";
