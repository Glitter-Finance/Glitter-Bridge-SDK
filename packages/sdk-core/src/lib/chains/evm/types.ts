import { ethers } from "ethers";
import { BridgeEvmNetworks } from "../../common/networks";
import { BridgeTokenConfig } from "../../common";

/**
 * Configuration for a token. (V1)
 *
 * @typedef {Object} TokenConfig
 * @property {string} symbol - The symbol of the token.
 * @property {string} name - The name of the token.
 * @property {number} decimals - The decimal places of the token.
 * @property {string} address - The address of the token.
 */
export type TokenConfig = {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
};

/**
 * Configuration for EVM networks.
 *
 * @typedef {Object} EvmConfig
 * @property {Object} network - Network configurations for each BridgeEvmNetworks.
 * @property {number} network.chainId - The chain ID of the EVM network.
 * @property {string} network.bridge - The bridge contract address on the EVM network.
 * @property {string} network.rpcUrl - The RPC URL of the EVM network.
 * @property {BridgeTokenConfig[]} network.tokens - The list of token configurations on the EVM network.
 * @property {string} network.depositWallet - The deposit wallet address on the EVM network.
 * @property {string} network.releaseWallet - The release wallet address on the EVM network.
 * @property {string} network.tokenBridge - The token bridge contract address on the EVM network.
 * @property {string} network.circleTreasury - The Circle Treasury address on the EVM network.
 */
export type EvmConfig = {
  [network in BridgeEvmNetworks]: {
    chainId: number;
    bridge: string;
    rpcUrl: string;
    tokens: BridgeTokenConfig[];
    depositWallet: string;
    releaseWallet: string;
    tokenBridge: string;
    circleTreasury: string;
  };
};

/**
 * Event representing a bridge deposit.
 *
 * @typedef {Object} BridgeDepositEvent
 * @property {ethers.BigNumber} amount - The amount of the deposit.
 * @property {number} destinationChainId - The chain ID of the destination network.
 * @property {string} destinationWallet - The wallet address on the destination network.
 * @property {string} erc20Address - The address of the ERC20 token.
 * @property {string} __type - The type of the event ("BridgeDeposit").
 */
export type BridgeDepositEvent = {
  amount: ethers.BigNumber;
  destinationChainId: number;
  destinationWallet: string;
  erc20Address: string;
  __type: "BridgeDeposit";
};

/**
 * Event representing a bridge release.
 *
 * @typedef {Object} BridgeReleaseEvent
 * @property {ethers.BigNumber} amount - The amount of the release.
 * @property {string} depositTransactionHash - The transaction hash of the corresponding deposit.
 * @property {string} destinationWallet - The wallet address on the destination network.
 * @property {string} erc20Address - The address of the ERC20 token.
 * @property {string} __type - The type of the event ("BridgeRelease").
 */
export type BridgeReleaseEvent = {
  amount: ethers.BigNumber;
  depositTransactionHash: string;
  destinationWallet: string;
  erc20Address: string;
  __type: "BridgeRelease";
};

/**
 * Event representing a transfer.
 *
 * @typedef {Object} TransferEvent
 * @property {string} from - The sender address.
 * @property {string} to - The recipient address.
 * @property {ethers.BigNumber} value - The transfer amount.
 * @property {string} __type - The type of the event ("Transfer").
 */
export type TransferEvent = {
  from: string;
  to: string;
  value: ethers.BigNumber;
  __type: "Transfer";
};

export type EvmNetworkConfig = EvmConfig[BridgeEvmNetworks];
