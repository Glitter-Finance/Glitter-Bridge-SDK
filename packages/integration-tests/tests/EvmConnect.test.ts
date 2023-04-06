import {BridgeNetworks, EvmConnect, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";
import {ethers} from "ethers";

describe("EvmConnect Tests", () => {
    let glitterSdk: GlitterBridgeSDK;
    let evmConnect: EvmConnect
    let wallet: ethers.Wallet;
    const defaultEvmNetwork = BridgeNetworks.Avalanche
    const defaultToken = "USDC"

    beforeAll(async () => {
        glitterSdk = new GlitterBridgeSDK();
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk = glitterSdk.connect([defaultEvmNetwork]);
        evmConnect = glitterSdk.avalanche!
        wallet = evmConnect.generateWallet
        wallet = wallet.connect(evmConnect.provider)
    });

    it("Should provide ethers provider", async () => {
        const provider = evmConnect.provider
        expect(provider).toBeTruthy()
    });

    it("Should provide supported token", async () => {
        const token = evmConnect.getToken(defaultToken)

        expect(token).toBeTruthy()
        expect(token?.decimals).toBeGreaterThan(0)
        if (token?.minTransfer) {
            expect(token.minTransfer).toBeGreaterThan(0)
        }
        expect(token?.name).toBeTruthy()
        expect(token?.symbol).toBeTruthy()
        expect(token?.symbol).toEqual(defaultToken)
    });

    it("Provides address of Bridge components", async () => {
        const bridgeContractAddress = evmConnect.getAddress("bridge")
        expect(bridgeContractAddress).toBeTruthy()
        const depositAddress = evmConnect.getAddress("depositWallet")
        expect(depositAddress).toBeTruthy()
        const recipientAddress = evmConnect.getAddress("releaseWallet")
        expect(recipientAddress).toBeTruthy()
        const tokenAddress = evmConnect.getAddress("tokens", defaultToken)
        expect(tokenAddress).toBeTruthy()
        expect(() => evmConnect.getAddress("tokens", "SHIBA")).toThrowError()
    });

    it("Provides balance of a supported token", async () => {
        const balance = await evmConnect.getTokenBalanceOnNetwork(
            defaultToken,
            wallet.address
        )
        expect(balance.toString()).toEqual("0")
    });

    it("Provides allowed amount to be used for bridging", async () => {
        const balance = await evmConnect.bridgeAllowance(
            defaultToken,
            wallet
        )
        expect(balance.toString()).toEqual("0")
    });

});
