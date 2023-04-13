import {BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";
import {BigNumber as BigNumberJS} from "bignumber.js";

export class TronBridge {
    public sdk: GlitterBridgeSDK;
    constructor() {
        this.sdk = new GlitterBridgeSDK();
        this.sdk.setEnvironment(GlitterEnvironment.mainnet);
        this.sdk.connect([BridgeNetworks.TRON]);
    }

    // TAKE THIS OUT AS A UTIL
    private async fromTokenUnits(
        amount: number,
        decimals: number
    ): Promise<number> {
        const bigNumberDecimals = new BigNumberJS(10).pow(decimals);
        return new BigNumberJS(amount).div(bigNumberDecimals).toNumber();
    }

    private async toTokenUnits(
        amount: number,
        decimals: number
    ): Promise<BigNumberJS> {
        const bigNumberDecimals = new BigNumberJS(10).pow(decimals);
        return new BigNumberJS(amount).multipliedBy(bigNumberDecimals);
    }

    /**
   * 
   * @param tokenSymbol Token Symbol to SWAP
   * @param toNetwork Destination Network
   * @param fromWalletAddress Source Wallet Address
   * @param toWalletAddress Destination Wallet Address
   * @param amount Amount To SWAP
   * @param tronWeb TronWeb Wallet Instance
   * @returns Transaction Hash
   */
    public async bridge(tokenSymbol: string, toNetwork: string, fromWalletAddress: string, toWalletAddress: string, amount: number, tronWeb: any) {
        const token = await this.getToken(tokenSymbol);
        if (!token) throw new Error("Invalid Asset");
        if (!token.minTransfer) throw new Error("Tron Error: Minimum Transfer Not defined in token");
        if (!this.sdk.tron) throw new Error("Tron Error.CLIENT_NOT_SET");
        if (amount < token.minTransfer) {
            throw new Error(`TronError: Minimum Value should be ${token.minTransfer}`);
        }
        let bigNumber = new BigNumberJS(0);
        if (token) {
            bigNumber = await this.toTokenUnits(amount, token.decimals);
        }
        const transaction = await this.sdk.tron.bridgeWeb(toNetwork as BridgeNetworks, tokenSymbol, bigNumber.toString(), toWalletAddress, fromWalletAddress, tronWeb);
        return transaction;
    }

    /**
   * 
   * @param signerAddress Wallet Address
   * @returns Array of Tokens Balances
   */
    public async getBalances(signerAddress: string) {
        const result = [];
        const tokens = this.sdk.tron?.tronConfig.tokens;
        if (tokens) {
            for (let index = 0; index < tokens?.length; index++) {
                const bigNumber = (await this.sdk.tron?.getTokenBalanceOnNetwork(tokens[index].symbol, signerAddress))?.toNumber()
                result.push({
                    token: tokens[index].symbol,
                    balance: bigNumber ? await this.fromTokenUnits(bigNumber, tokens[index].decimals) : 0
                })
            }
        }
        return result;
    }

    public async getToken(tokenSymbol: string) {
        const token = await this.sdk.tron?.getToken(tokenSymbol);
        return token;
    }
}