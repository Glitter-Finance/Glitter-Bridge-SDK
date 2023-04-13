import {Commitment, Connection, PublicKey} from "@solana/web3.js";
import {SolflareWalletAdapter} from "@solana/wallet-adapter-wallets";
import Wallet from "@project-serum/sol-wallet-adapter";
import {SOLFLARE_WALLET_PROVIDER_WEB} from "../utils/constants";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";

declare global {
  interface Window {
    solflare?: any;
  }
}
export class Solflare {
    connection: Connection
    walletPublicKey: PublicKey | null
    provider: any = null;
    solfareWalletAdapter: SolflareWalletAdapter | Wallet;
    constructor(rpcUrl: string) {
        this.connection = new Connection(rpcUrl);
        this.provider = this.getProvider();
        this.walletPublicKey = null;
        if (window.solflare) {
            this.solfareWalletAdapter = new SolflareWalletAdapter({network: WalletAdapterNetwork.Mainnet});
        } else {
            this.solfareWalletAdapter = new Wallet(SOLFLARE_WALLET_PROVIDER_WEB, WalletAdapterNetwork.Mainnet);
        }
    }

    async connect() {
        await this.solfareWalletAdapter.connect()
        this.walletPublicKey = this.solfareWalletAdapter.publicKey
        return this.walletPublicKey;
    }

    async getProvider() {
        return this.solfareWalletAdapter;
    }

    async getConnection(): Promise<Connection> {
        if (!this.connection) {
            throw new Error('SolfareManager is not initialized')
        }
        return this.connection
    }

    getWalletPublicKey(): PublicKey {
        if (!this.walletPublicKey) {
            throw new Error('Wallet not initialized')
        }
        return this.walletPublicKey
    }

    getAdapter(): SolflareWalletAdapter | Wallet {
        if (this.solfareWalletAdapter.connected) {
            return this.solfareWalletAdapter
        }
        throw new Error('Solfare wallet not connected')
    }

    _getConnectionStatus(): boolean {
        return this.solfareWalletAdapter.connected
    }

    async getActiveAccountAddress(): Promise< string | undefined> {
        let res:string | undefined ;
        if (this._getConnectionStatus()) {

            res = this.getWalletPublicKey().toBase58()
        }
        return res;
    }

    getAccountBalance(account: PublicKey) {
        return this.connection.getBalance(account, "confirmed" as Commitment)
    }

    async getCurrentAccountBalance(): Promise<number | null> {
        if (this.solfareWalletAdapter.connected) {
            return this.connection.getBalance(
                this.getWalletPublicKey(),
        "confirmed" as Commitment,
            )
        }
        return null
    }
}