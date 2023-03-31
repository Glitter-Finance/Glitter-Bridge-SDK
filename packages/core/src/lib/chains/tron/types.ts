import {BridgeTokenConfig} from "src/lib/common/tokens";

export type TronConfig = {
  fullNode: string;
  solidityNode: string;
  eventServer: string;
  addresses: {
    bridge: string;
    depositWallet: string;
    releaseWallet: string;
  };
  tokens: BridgeTokenConfig[];
};

export type EventTopics = "BridgeRelease" | "Transfer";
