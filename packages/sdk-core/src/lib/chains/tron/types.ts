import { BridgeTokenConfig } from "../../common/tokens";

/**
 * Represents the configuration for the Tron connection.
 *
 * @typedef {Object} TronConfig
 * @property {string} fullNode - The URL of the Tron full node.
 * @property {string} solidityNode - The URL of the Tron solidity node.
 * @property {string} eventServer - The URL of the Tron event server.
 * @property {Object} addresses - The addresses for various entities.
 * @property {string} addresses.bridge - The address of the Tron bridge.
 * @property {string} addresses.depositWallet - The address of the deposit wallet.
 * @property {string} addresses.releaseWallet - The address of the release wallet.
 * @property {BridgeTokenConfig[]} tokens - The configuration for the bridge tokens.
 */
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
