import {BridgeNetworks, EvmConnect, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";
import {ethers} from "ethers";
import {formatEther} from "ethers/lib/utils";

describe("EvmConnect", () => {
    let glitterSdk: GlitterBridgeSDK;
    let evmConnect: EvmConnect
    let wallet: ethers.Wallet;
    const defaultEvmNetwork = BridgeNetworks.Avalanche
    const defaultToken = "USDC"

    beforeAll(() => {
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

    it("Is able to parse Deposit and transfer event", async () => {
        const depositTxHash = "0xf06ccc91a00b0d9a09ac6f144f640e65af35fb3ddff0ebf6b6005cd86a329d34"
        const events = await evmConnect.parseLogs(depositTxHash)
        const deposit = events.find(x => x.__type === "BridgeDeposit")

        expect(events.length).toEqual(2)
        expect(deposit).toBeTruthy()
    });

    it("Is able to parse Release and transfer event", async () => {
        const releaseTxHash = "0xf34b3360eb0fabd469aebba6d75413c37b365c54bef48f7be5d2d304cb78466a"
        const events = await evmConnect.parseLogs(releaseTxHash)
        const release = events.find(x => x.__type === "BridgeRelease")

        expect(events.length).toEqual(2)
        expect(release).toBeTruthy()
    });

    it("EUROC Support", async () => {
        // EURC is not available on testnet
        let _glitterSdk = new GlitterBridgeSDK();
        _glitterSdk.setEnvironment(GlitterEnvironment.mainnet)
        _glitterSdk = _glitterSdk.connect([defaultEvmNetwork]);
        const euroc = _glitterSdk.avalanche!.getToken("EUROC");
        expect(euroc).toBeTruthy();
    });

    it("EUROC Error on invalid destination", async () => {
        // EURC is not available on testnet
        let _glitterSdk = new GlitterBridgeSDK();
        _glitterSdk.setEnvironment(GlitterEnvironment.mainnet)
        _glitterSdk = _glitterSdk.connect([defaultEvmNetwork]);
        let _wallet = await _glitterSdk.avalanche?.generateWallet;
        _wallet = _wallet?.connect(_glitterSdk.avalanche!.provider)
        const addr = await _wallet?.getAddress()

        if (addr && _wallet) {
            await expect(
                _glitterSdk.avalanche?.bridge(addr, BridgeNetworks.algorand, "EURC", '1000000', _wallet!)
            ).rejects.toThrow()
        }
    });

    it("should instantiate Arbitrum", async () =>{
        let _glitterSdk = new GlitterBridgeSDK();
        _glitterSdk.setEnvironment(GlitterEnvironment.mainnet)
        _glitterSdk = _glitterSdk.connect([BridgeNetworks.Arbitrum]);
        evmConnect = _glitterSdk.arbitrum!
        expect(evmConnect).toBeTruthy()
    })

    it("should provide ARB ETH balance", async () =>{
        let _glitterSdk = new GlitterBridgeSDK();
        _glitterSdk.setEnvironment(GlitterEnvironment.mainnet)
        _glitterSdk = _glitterSdk.connect([BridgeNetworks.Arbitrum]);
        evmConnect = _glitterSdk.arbitrum!
        const arbEthAddr = "0xfdc41b43d544252c16E8C8498B4bC3C85905C040"
        const arbEthBalance = await evmConnect.provider.getBalance(arbEthAddr)
        expect(Number(formatEther(arbEthBalance))).toBeGreaterThan(0)
    })

    it("should provide ARB USDC", async () =>{
        let _sdk = new GlitterBridgeSDK();
        _sdk.setEnvironment(GlitterEnvironment.mainnet)
        _sdk = _sdk.connect([BridgeNetworks.Arbitrum]);
        const arbEthAddr = "0xfdc41b43d544252c16E8C8498B4bC3C85905C040"
        const connect = _sdk.arbitrum!
        const tokenAddress = connect.getAddress('tokens', "USDC");
        expect(tokenAddress).toBeTruthy()
        const tokenBalance = await connect.getTokenBalanceOnNetwork('USDC', arbEthAddr);
        expect(Number(formatEther(tokenBalance))).toBeGreaterThanOrEqual(0)
    })
});
