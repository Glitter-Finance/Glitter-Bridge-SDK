import {DeflyWalletConnect} from "@blockshake/defly-connect";
export class Defly {
    deflyWallet: DeflyWalletConnect;

    constructor() {
        this.deflyWallet = new DeflyWalletConnect();
    }

    async connect() {
        const walletResponse = await this.deflyWallet.connect();
        return {wallet: walletResponse, provider: this.deflyWallet};
    }

    async reconnect() {
        const walletResponse = await this.deflyWallet.reconnectSession();
        return {wallet: walletResponse, provider: this.deflyWallet};
    }

    async disconnect() {
        return await this.deflyWallet.disconnect();
    }
}