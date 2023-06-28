import { Metamask } from "./metamask";
import { Coin98 } from "./coin98";
import { Phantom } from "./phantom";
import { Solflare } from "./solflare";
import { Pera } from "./pera";
import { Chains } from "./Chains";
import { Defly } from "./defly";
import { TronLink } from "./tronlink";
import { WConnect } from "./walletconnect";

export class Wallets {
    public static networks = {
        [Chains.ETHEREUM]: { metamask: Metamask, walletConnect: WConnect, coin98: Coin98, phantom: Phantom },
        [Chains.ETHEREUM_GOERLI]: { metamask: Metamask, walletConnect: WConnect, coin98: Coin98, phantom: Phantom },
        [Chains.BSC]: { metamask: Metamask, walletConnect: WConnect },
        [Chains.SOLANA]: { solflare: Solflare, phantom: Phantom },
        [Chains.ALGO]: { pera: Pera, defly: Defly, walletConnect: WConnect },
        [Chains.AVALANCHE]: { metamask: Metamask, walletConnect: WConnect, coin98: Coin98 },
        [Chains.POLYGON]: { metamask: Metamask, walletConnect: WConnect, coin98: Coin98 },
        [Chains.TRON]: { tronLink: TronLink },
        [Chains.ZKEVM]: { metamask: Metamask, WalletConnect: WConnect, coin98: Coin98 },
        [Chains.OPTIMISM]: { metamask: Metamask, WalletConnect: WConnect, coin98: Coin98 },
        [Chains.ARBITRUM]: { metamask: Metamask, WalletConnect: WConnect, coin98: Coin98 },
    }
}
