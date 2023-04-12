import {BridgeEvmNetworks, BridgeNetworks, BridgeTokens, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";
import {Signer} from "ethers";
import {PublicKey} from "@solana/web3.js";
import {BigNumber as BigNumberJS} from "bignumber.js";

export class EVMBridge {
    private sdk: GlitterBridgeSDK;
    private network: BridgeEvmNetworks;

    constructor(network: BridgeEvmNetworks, testnet = false) {
        this.network = network;
        this.sdk = new GlitterBridgeSDK();
        this.sdk.setEnvironment(testnet ? GlitterEnvironment.testnet : GlitterEnvironment.mainnet);
        this.sdk.connect([BridgeNetworks.Avalanche, BridgeNetworks.Ethereum, BridgeNetworks.Polygon]);
    }

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

    public async approve(tokenSymbol: string, amount: number, signer: Signer) {
        const token = this.sdk[this.network]?.config.tokens.find(x => x.symbol.toLowerCase() === tokenSymbol.toLowerCase());
        let bigNumber = new BigNumberJS(0);
        if (token) {
            bigNumber = await this.toTokenUnits(amount, token.decimals);
        }
        console.log("Token", token, amount, bigNumber.toString())
        return this.sdk[this.network]?.approveTokensForBridge(tokenSymbol, bigNumber.toString(), signer);
    }

    public async bridgeAllowance(tokenSymbol: string, signer: Signer) {
        return this.sdk[this.network]?.bridgeAllowance(tokenSymbol, signer);
    }

    public async bridge(toNetwork: BridgeNetworks, tokenSymbol: string, amount: number, toWalletAddress: string | PublicKey, signer: Signer) {
        const token = this.sdk[this.network]?.config.tokens.find(x => x.symbol.toLowerCase() === tokenSymbol.toLowerCase());
        let bigNumber = new BigNumberJS(0);
        if (token) {
            bigNumber = await this.toTokenUnits(amount, token.decimals);
        }
        console.log("Token", token, amount, bigNumber.toString())
        return this.sdk[this.network]?.bridge(
            toWalletAddress,
            toNetwork,
            tokenSymbol,
            bigNumber.toString(),
            signer
        );
    }

    public async getBalances(signerAddress: string) {
        const result = [];
        const tokens = this.sdk[this.network]?.config.tokens;
        if (tokens) {
            for (let index = 0; index < tokens?.length; index++) {
                const bigNumber = (await this.sdk[this.network]?.getTokenBalanceOnNetwork(tokens[index].symbol, signerAddress))?.toNumber()
                result.push({
                    token: tokens[index].symbol,
                    balance: bigNumber ? await this.fromTokenUnits(bigNumber, tokens[index].decimals) : 0
                })
            }
        }
        return result;
    }

    public async getToken(tokenSymbol: string) {
        return this.sdk[this.network]?.getToken(tokenSymbol);
    }

    public async getTokens() {
        return BridgeTokens.getTokens(this.network);
    }
}
