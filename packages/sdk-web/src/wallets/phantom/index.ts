import {PhantomWalletAdapter} from "@solana/wallet-adapter-wallets";
import {Connection, PublicKey, Commitment} from "@solana/web3.js";
declare global {
  interface Window {
    solana?: any;
  }
}
export class Phantom {
    connection: Connection
    walletPublicKey: PublicKey | null
    provider: any = null;
    phantomWalletAdapter: PhantomWalletAdapter = new PhantomWalletAdapter()

    constructor(rpcUrl: string) {
        this.connection = new Connection(rpcUrl);
        this.provider = this.getProvider();
        this.walletPublicKey = null;
    }

    async connect() {
        if (window.solana.isPhantom) {
            await this.phantomWalletAdapter.connect()
            this.phantomWalletAdapter.on('error', (error) => {
                throw new Error('Phantom wallet error: ' + error)
            })
            this.walletPublicKey = this.phantomWalletAdapter.publicKey

            return this.walletPublicKey;
        } else {
            return "No Address";
        }
    }
    async getProvider() {
        if ("solana" in window) {
            const provider: any = window.solana
            if (provider.isPhantom) {
                return provider
            }
        }
        throw new Error("MNEMONIC_NOT_PRESENT")
    }

    async getConnection(): Promise<Connection> {
        if (!this.connection) {
            throw new Error('PhantomManager is not initialized')
        }
        return this.connection
    }

    getWalletPublicKey(): PublicKey {
        if (!this.walletPublicKey) {
            throw new Error('Wallet not initialized')
        }
        return this.walletPublicKey
    }

    getAdapter(): PhantomWalletAdapter {
        if (this.phantomWalletAdapter.connected) {
            return this.phantomWalletAdapter
        }
        throw new Error('Phantom wallet not connected')
    }

    async signMessage(message: string): Promise<Uint8Array> {
        if (this.phantomWalletAdapter.connected) {
            return this.phantomWalletAdapter.signMessage(Buffer.from(message))
        }
        throw new Error('Phantom wallet not connected')
    }

    _getConnectionStatus(): boolean {
        return this.phantomWalletAdapter.connected
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
        if (this.phantomWalletAdapter.connected) {
            return this.connection.getBalance(
                this.getWalletPublicKey(),
        "confirmed" as Commitment,
            )
        }
        return null
    }

}