import {
    BridgeEvmNetworks,
    BridgeNetworks,
    BridgeV2Tokens,
    GlitterBridgeSDK,
    GlitterEnvironment,
    Token2ChainConfig,
} from "@glitter-finance/sdk-core";
import { PublicKey } from "@solana/web3.js";
import { BigNumber as BigNumberJS } from "bignumber.js";
import { Signer } from "ethers";
import { EvmNetworks } from "../wallets/Chains";

export class EVMBridge {
    private sdk: GlitterBridgeSDK;
    private network: BridgeEvmNetworks;

    constructor(network: BridgeEvmNetworks, testnet = false) {
        this.network = network;
        this.sdk = new GlitterBridgeSDK();
        this.sdk.setEnvironment(
            testnet ? GlitterEnvironment.testnet : GlitterEnvironment.mainnet
        );
        this.sdk.connect(EvmNetworks);
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

    /**
     * Approve tokens for the bridge in to contract
     * @param tokenSymbol
     * @param amount
     * @param signer
     */
    public async approve(tokenSymbol: string, amount: number, signer: Signer) {
        const token = this.sdk[this.network]?.config.tokens.find(
            (x) => x.symbol.toLowerCase() === tokenSymbol.toLowerCase()
        );
        let bigNumber = new BigNumberJS(0);
        if (token) {
            bigNumber = await this.toTokenUnits(amount, token.decimals);
        }
        console.log("Token", token, amount, bigNumber.toString());
        return this.sdk[this.network]?.approveTokensForBridge(
            tokenSymbol,
            bigNumber.toString(),
            signer
        );
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
     * @param toNetwork
     * @param tokenSymbol
     * @param amount
     * @param toWalletAddress
     * @param signer
     */
    public async bridge(
        toNetwork: BridgeNetworks,
        tokenSymbol: string,
        amount: number,
        toWalletAddress: string | PublicKey,
        signer: Signer
    ) {
        const token = this.sdk[this.network]?.config.tokens.find(
            (x) => x.symbol.toLowerCase() === tokenSymbol.toLowerCase()
        );
        let bigNumber = new BigNumberJS(0);
        if (token) {
            bigNumber = await this.toTokenUnits(amount, token.decimals);
        }
        console.log("Token", token, amount, bigNumber.toString());
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
     * 
     * @returns Promise<Array<{token: string, balance: number}>>
     */
    public async getBalances(signerAddress: string) {
        const tokens = this.getTokens();
        console.log({ tokens: tokens.map(x => x.symbol) });
        if (!tokens) return [];
        const balanceBatch = tokens.map(async (x) => {
            const bigNumber = await this.sdk[this.network]?.getTokenBalanceOnNetwork(
                x.symbol,
                signerAddress
            ).then(bn => bn.toNumber());
            const decimals = x.decimals;
            const balance = bigNumber
                ? await this.fromTokenUnits(
                    bigNumber,
                    decimals,
                )
                : 0;

            return {
                token: x.symbol,
                balance
            }
        });

        return Promise.allSettled(balanceBatch).then(
            response => response
                .filter(x => x.status === "fulfilled")
                // @ts-expect-error We are filtering the fulfilled here, typescript doesn't understand type conversion
                .map(x => x).map(x => x.value)
        )
    }

    public async getToken(tokenSymbol: string) {
        return this.sdk[this.network]?.getToken(tokenSymbol);
    }

    public getTokens() {
        const tokenList = BridgeV2Tokens.getTokenList();
        const output: Token2ChainConfig[] = [];
        tokenList?.forEach(x => {
            const inNetwork = x.chains.find(chain => chain.chain.toLowerCase() === this.network.toLowerCase());
            if (inNetwork) {
                output.push(inNetwork);
            }
        })

        return output;
    }
}
