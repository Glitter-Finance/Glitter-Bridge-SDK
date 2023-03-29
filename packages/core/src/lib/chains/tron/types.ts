import {EvmTokenConfig} from "../evm";

export type TronConfig = {
  fullNode: string;
  solidityNode: string;
  eventServer: string;
  addresses: {
    bridge: string;
    depositWallet: string;
    releaseWallet: string;
  };
  tokens: EvmTokenConfig[];
};

export type EventTopics = "BridgeRelease" | "Transfer";
