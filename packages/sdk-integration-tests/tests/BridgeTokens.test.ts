import {BridgeNetworks, BridgeTokenConfig, BridgeTokens, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";

describe("BridgeTokens", () => {
    let glitterSdk: GlitterBridgeSDK;
    const defaultToken = "USDC"
    const NETWORKS = [
        BridgeNetworks.algorand,
        BridgeNetworks.Avalanche,
        BridgeNetworks.Ethereum,
        BridgeNetworks.Polygon,
        BridgeNetworks.solana,
        BridgeNetworks.TRON
    ]

    beforeAll(() => {
        glitterSdk = new GlitterBridgeSDK();
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk = glitterSdk.connect(NETWORKS);        
    });

    it("Static methods should be callable", () => {
        expect(BridgeTokens.getToken(BridgeNetworks.algorand, defaultToken)).toBeTruthy()
    })

    it("USDC should be provided for all chains", () => {
        for (const network of NETWORKS) {
            const token = BridgeTokens.getToken(network, defaultToken)
            expect(token).toBeTruthy()
            expect(token?.decimals).toBeGreaterThan(0)
            if (token?.minTransfer) {
                expect(token.minTransfer).toBeGreaterThan(0)
            }
            expect(token?.name).toBeTruthy()
            expect(token?.symbol).toBeTruthy()
            expect(token?.symbol).toEqual(defaultToken)
        }
    })

    it("Should be able to provide list of tokens", () => {
        for (const network of NETWORKS) {
            const token = BridgeTokens.getTokens(network)
            expect(token.length).toBeGreaterThan(0)
        }
    })

    it("Should be able to add a token", () => {
        const network = BridgeNetworks.Ethereum
        const usdtOnEth: BridgeTokenConfig = {
            symbol: "USDT",
            name: "USD Tether",
            decimals: 6,
            address: "0xdac17f958d2ee523a2206206994597c13d831ec7"
        }

        BridgeTokens.add(network, [usdtOnEth])

        const exists = BridgeTokens.getToken(network, usdtOnEth.symbol)
        expect(exists).toBeTruthy();
        expect(exists.symbol).toEqual(usdtOnEth.symbol);
        expect(exists.name).toEqual(usdtOnEth.name);
        expect(exists.address).toEqual(usdtOnEth.address);
        expect(exists.decimals).toEqual(usdtOnEth.decimals);
    })

    it("Should not add an asset without asset id Algorand", () => {
        const network = BridgeNetworks.algorand
        const usdtOnAlgo = {
            symbol: "USDT",
            name: "USD Tether",
            decimals: 6
        }

        BridgeTokens.add(network, [usdtOnAlgo as any])

        const exists = BridgeTokens.getToken(network, usdtOnAlgo.symbol)
        expect(exists).toBeUndefined();
    })

    it("Provides token config regardless of symbol case sensitivity", () => {
        const test = ["uSDC", "UsDC"];
        for (const network of NETWORKS) {
            for (const random of test) {
                const exists = BridgeTokens.getToken(network, random)
                expect(exists).toBeTruthy();
            }
        }
    })
});
