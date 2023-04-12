// eslint-disable-next-line @typescript-eslint/no-var-requires
const TronWeb = require("tronweb");

declare global {
  interface Window {
    tronWeb?: any;
  }
}

export class TronLink {
    connection: typeof TronWeb;
    provider: any;
    constructor(hostServer = "", eventServer = "") {
        this.connection = new TronWeb({
            fullHost: hostServer !== "" ? hostServer : "https://api.trongrid.io",
            eventServer: eventServer !== "" ? eventServer : "https://api.trongrid.io",
        })
        this.provider = window.tronWeb;
    }

    public async connect() {
        const tronWebExt = window?.tronWeb;
        if (tronWebExt) {
            const address = window?.tronWeb?.defaultAddress?.base58;
            console.log("Tron Address", address, "Tron Web Provider", tronWebExt);
            if (address) {
                await this.connection.setAddress(address);
                this.provider = tronWebExt;
                return address;
            } else {
                throw new Error("Unlock your Tron Wallet")
            }
        } else {
            throw new Error("No TronLink installed");
        }
    }

    public async getEnergy(address: string) {
        const resources = await this.connection.trx.getAccountResources(address);
        if (!("EnergyLimit" in resources) || !("EnergyUsed" in resources)) {
            console.log("[TronReleaseHandler] Unable to retrieve account resources");
            return false;
        }
        if (resources.EnergyLimit - resources.EnergyUsed < 30_000) {
            console.log(
                "[TronReleaseHandler] Release account does not have enough energy"
            );
            return false;
        }
        return true;
    }

    public getProvider() {
        return this.provider;
    }
}