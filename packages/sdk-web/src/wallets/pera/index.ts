import {PeraWalletConnect} from "@perawallet/connect";
export class Pera {

    peraWallet: PeraWalletConnect;

    constructor() {
        this.peraWallet = new PeraWalletConnect();
    }
    async connect() {
        const walletResponse = await this.peraWallet.connect();
        return {wallet: walletResponse, provider: this.peraWallet};
    }

    async reconnect() {
        const walletResponse = await this.peraWallet.reconnectSession();
        return {wallet: walletResponse, provider: this.peraWallet};
    }

    async disconnect() {
        return await this.peraWallet.disconnect();
    }
}