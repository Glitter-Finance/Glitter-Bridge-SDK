import { BridgeEvmNetworks, BridgeV2Tokens, BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment } from "@glitter-finance/sdk-core";
import { Signer } from "ethers";
import { PublicKey } from "@solana/web3.js";
import { BigNumber as BigNumberJS } from "bignumber.js";

export class EVMBridge {
    private sdk: GlitterBridgeSDK;
    private network: BridgeEvmNetworks;

    constructor(network: BridgeEvmNetworks, testnet = false) {
        this.network = network;
        this.sdk = new GlitterBridgeSDK();
        this.sdk.setEnvironment(testnet ? GlitterEnvironment.testnet : GlitterEnvironment.mainnet);
        this.sdk.connect([BridgeNetworks.Avalanche, BridgeNetworks.Ethereum, BridgeNetworks.Polygon]);
    }

    // private async _fromTokenUnits(
    //     amount: number,
    //     decimals: number
    // ): Promise<number> {
    //     const bigNumberDecimals = new BigNumberJS(10).pow(decimals);
    //     return new BigNumberJS(amount).div(bigNumberDecimals).toNumber();
    // }

    private async toTokenUnits(
        amount: number,
        decimals: number
    ): Promise<BigNumberJS> {
        const bigNumberDecimals = new BigNumberJS(10).pow(decimals);
        return new BigNumberJS(amount).multipliedBy(bigNumberDecimals);
    }

    /**
     * Approve tokens for the bridge in to contract
     * @param tokenSymbol
     * @param amount
     * @param signer
     */
    public async approve(tokenSymbol: string, amount: number, signer: Signer) {
        const token = this.sdk[this.network]?.config.tokens.find(x => x.symbol.toLowerCase() === tokenSymbol.toLowerCase());
        let bigNumber = new BigNumberJS(0);
        if (token) {
            bigNumber = await this.toTokenUnits(amount, token.decimals);
        }
        console.log("Token", token, amount, bigNumber.toString())
        return this.sdk[this.network]?.approveTokensForBridge(tokenSymbol, bigNumber.toString(), signer);
    }

    /**
     * Getting Bridge Allowance for a particular token
     * @param tokenSymbol
     * @param signer
     */
    public async bridgeAllowance(tokenSymbol: string, signer: Signer) {
        return this.sdk[this.network]?.bridgeAllowance(tokenSymbol, signer);
    }

    /**
     * Bridging a token from supported EVM network to other supported network
     * @param {BridgeNetworks} toNetwork
     * @param tokenSymbol
     * @param amount
     * @param toWalletAddress
     * @param signer
     */
    public async bridge(toNetwork: BridgeNetworks, tokenSymbol: string, amount: number, toWalletAddress: string | PublicKey, signer: Signer) {
        const token = this.sdk[this.network]?.config.tokens.find(x => x.symbol.toLowerCase() === tokenSymbol.toLowerCase());
        const bigNumber = token ? await this.toTokenUnits(amount, token.decimals) : new BigNumberJS(0);

        console.log("Token", token, amount, bigNumber.toString())

        return this.sdk[this.network]?.bridge(
            toWalletAddress,
            toNetwork,
            tokenSymbol,
            bigNumber.toString(),
            signer
        );
    }

    /**
     * Getting token balances by wallet address
     * @param signerAddress
     */
    public async getBalances(signerAddress: string) {
        const tokens = await this.getTokens()
        if (!tokens) return Promise.resolve([]);

        const result = tokens
            .filter(parentToken => parentToken.chains.filter(availableChain => availableChain.chain.toLowerCase() === this.network.toLowerCase()))
            .map(parentToken => BridgeV2Tokens.getTokenConfigChild(parentToken, this.network))
            .map(async evmTokenConfig => evmTokenConfig ? ({
                token: evmTokenConfig.symbol,
                balance: await this.sdk[this.network]?.getTokenBalanceOnNetwork(evmTokenConfig.symbol, signerAddress)
            }) : (null));
        Promise.all(result).then(t => console.log({ t }))

        return Promise.all(result);
    }

    public async getToken(tokenSymbol: string) {
        return this.sdk[this.network]?.getToken(tokenSymbol);
    }

    public async getTokens() {
        return BridgeV2Tokens.getTokenList();
    }
}
