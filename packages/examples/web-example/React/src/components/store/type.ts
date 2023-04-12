import {ChainNames} from "glitter-bridge-sdk-web-dev";

export interface IWallet {
    sourceWalletAddress?: string;
    sourceWalletProvider?: any;
    sourceNetworkName?: string;
    sourceWalletName?: string;
    destinationWalletAddress?: string;
    destinationWalletName?: string;
    destinationNetworkName?: string;
    destinationWalletProvider?: any;
    sourceTokens?: { token: string; balance: number | undefined }[];
    destinationTokens?: { token: string; balance: number | undefined }[];
    selectedSourceTokenSymbol?: string;
    selectedDestinationTokenSymbol?: string;
    walletModal?: boolean;
    status?: string;
    subStatus?: string;
    txId?: string;
}

export type WalletAction = {
    type: string
    wallet?: IWallet
}

export type DispatchType = (args: WalletAction) => WalletAction

export const RPC_URL = "https://neat-solitary-darkness.solana-mainnet.quiknode.pro/ceec00cc12c1b9c377b73e78f2548b2732fe34b1/";

export const BridgeMapping = [
  {
    sourceToken: "SOL",
    destinationToken: "xSOL",
  },
  {
    sourceToken: "xSOL",
    destinationToken: "SOL",
  },
  {
    sourceToken: "ALGO",
    destinationToken: "xALGO",
  },
  {
    sourceToken: "xALGO",
    destinationToken: "ALGO",
  },
  {
    sourceToken: "USDC",
    destinationToken: "USDC",
  }
]

export const Chains = [
    {
        name: ChainNames.SOLANA,
        icon: "Solana.png",
        wallets: [
            {
                name: "phantom",
                icon: "phantom.png",
            },
            {
                name: "solflare",
                icon: "solflare.png",
            }
        ]
    },
    {
        name: ChainNames.ALGORAND,
        icon: "Algorand.png",
        wallets: [
            {
                name: "defly",
                icon: "defly.png",
            },
            {
                name: "pera",
                icon: "pera.png",
            }
        ]
    },
    {
        name: ChainNames.ETHEREUM,
        icon: "ethereum.png",
        wallets: [
            {
                name: "metamask",
                icon: "metamask.png",
            }
        ]
    },
    {
        name: ChainNames.AVALANCHE,
        icon: "avalanche.png",
        wallets: [
            {
                name: "metamask",
                icon: "metamask.png",
            }
        ]
    },
    {
        name: ChainNames.POLYGON,
        icon: "polygon.png",
        wallets: [
            {
                name: "metamask",
                icon: "metamask.png",
            }
        ]
    }
]
