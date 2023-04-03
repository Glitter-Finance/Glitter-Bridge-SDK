import { ethers } from "ethers";
import { BridgeEvmNetworks } from "../../common/networks/networks";
import { BridgeToken } from "../..//common";
export type TokenConfig = {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
};

export type EvmConfig = {
    [network in BridgeEvmNetworks]: {
        chainId: number;
        bridge: string;
        tokenV2Bridge: string;
        rpcUrl: string;
        tokens: BridgeToken[];
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
