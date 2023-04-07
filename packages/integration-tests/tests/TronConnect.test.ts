import {BridgeNetworks, TronConnect, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";

describe("TronConnect", () => {
    let glitterSdk: GlitterBridgeSDK;
    let tronConnect: TronConnect
    const network = BridgeNetworks.TRON
    const defaultToken = "USDC"
    const tronAddress = "TEWifyy5yrm7zWbWBs5RVbLyZm4JPiawpf"

    beforeAll(() => {
        glitterSdk = new GlitterBridgeSDK();
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk = glitterSdk.connect([network]);
        tronConnect = glitterSdk.tron!
    });

    it("Should provide tronweb", async () => {
        const provider = tronConnect.tronWeb
        expect(provider).toBeTruthy()
    });

    it("Should provide supported token", async () => {
        const token = tronConnect.getToken(defaultToken)

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
        const bridgeContractAddress = tronConnect.getAddress("bridge")
        expect(bridgeContractAddress).toBeTruthy()
        const depositAddress = tronConnect.getAddress("depositWallet")
        expect(depositAddress).toBeTruthy()
        const recipientAddress = tronConnect.getAddress("releaseWallet")
        expect(recipientAddress).toBeTruthy()
        const tokenAddress = tronConnect.getAddress("tokens", defaultToken)
        expect(tokenAddress).toBeTruthy()
        expect(() => tronConnect.getAddress("tokens", "SHIBA")).toThrowError()
    });

    it("Provides balance of a supported token", async () => {
        const balance = await tronConnect.getTokenBalanceOnNetwork(
            defaultToken,
            tronAddress
        )
        expect(balance.toNumber()).toBeGreaterThan(0)
    });

    it("Is able to parse Deposit and transfer event", async () => {
        const depositTxHash = "d455f210f9505a414d20c18c9ebcf5289754797924f33947bffee5baa416b827"
        const depositInfo = await tronConnect.deSerializeDepositEvent(depositTxHash)

        expect(depositInfo).toBeTruthy()
        expect(depositInfo?.amount).toBeTruthy()
        expect(depositInfo?.destination).toBeTruthy()
    });

    it("Is able to parse Release and transfer event", async () => {
        const releaseTxHash = "7b14586605b84a0b0aa02a5442a92c122122a12ea9d9cee829f29978d7e2ae7a"
        const events = await tronConnect.getBridgeLogs(releaseTxHash)

        expect(events).toBeTruthy()
        expect(events.length).toEqual(2)
        expect(events.find(x => x.__type === "BridgeRelease")).toBeTruthy()
    });
});
