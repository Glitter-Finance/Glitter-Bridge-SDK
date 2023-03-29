import {ethers} from "ethers";
import {BridgeEvmNetworks} from "../../common/networks/networks";

export type EvmTokenConfig = {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  bridgeConfig: {
    minTransferAmount: number;
  };
};

export type EvmConfig = {
  [network in BridgeEvmNetworks]: {
    chainId: number;
    bridge: string;
    rpcUrl: string;
    tokens: EvmTokenConfig[];
    depositWallet: string;
    releaseWallet: string;
  };
};

export type BridgeDepositEvent = {
  amount: ethers.BigNumber;
  destinationChainId: number;
  destinationWallet: string;
  erc20Address: string;
  __type: "BridgeDeposit";
};

export type BridgeReleaseEvent = {
  amount: ethers.BigNumber;
  depositTransactionHash: string;
  destinationWallet: string;
  erc20Address: string;
  __type: "BridgeRelease";
};

export type TransferEvent = {
  from: string;
  to: string;
  value: ethers.BigNumber;
  __type: "Transfer";
};

export type EvmNetworkConfig = EvmConfig[BridgeEvmNetworks];
