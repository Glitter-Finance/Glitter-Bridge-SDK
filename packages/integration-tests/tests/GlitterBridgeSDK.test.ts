import {BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment} from "@glitter-finance/sdk-core";

// yarn test:core -- -t GlitterBridgeSDK
describe("GlitterBridgeSDK", () => {
    let glitterSdk: GlitterBridgeSDK;

    beforeEach(async () => {
        glitterSdk = new GlitterBridgeSDK();
    });

    it("Should be able to connect to all Networks", async () => {
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)

        glitterSdk = glitterSdk.connect([
            BridgeNetworks.algorand,
            BridgeNetworks.Avalanche,
            BridgeNetworks.Ethereum,
            BridgeNetworks.Polygon,
            BridgeNetworks.solana,
            BridgeNetworks.TRON
        ])

        expect(glitterSdk).toBeTruthy();
        expect(glitterSdk.algorand).toBeTruthy();
        expect(glitterSdk.avalanche).toBeTruthy();
        expect(glitterSdk.ethereum).toBeTruthy();
        expect(glitterSdk.polygon).toBeTruthy();
        expect(glitterSdk.solana).toBeTruthy();
        expect(glitterSdk.tron).toBeTruthy();
    });

    it("Should throw error for an invalid environment", async () => {
        expect(() => {
            glitterSdk.setEnvironment("env" as any)
        }).toThrowError()
    });

    it("Should throw error without an environment", async () => {
        expect(() => {
            glitterSdk.connect([
                BridgeNetworks.algorand,
                BridgeNetworks.Avalanche,
                BridgeNetworks.Ethereum,
                BridgeNetworks.Polygon,
                BridgeNetworks.solana,
                BridgeNetworks.TRON
            ])

        }).toThrowError()
    });

    it("Only connected network should be defined", async () => {
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk.connect([
            BridgeNetworks.algorand,
        ])

        expect(glitterSdk.algorand).toBeTruthy()
        expect(glitterSdk.avalanche).toBeUndefined()
        expect(glitterSdk.ethereum).toBeUndefined()
        expect(glitterSdk.polygon).toBeUndefined()
        expect(glitterSdk.solana).toBeUndefined()
        expect(glitterSdk.tron).toBeUndefined()
    });

    it("getEvmNetwork Provides EvmConnect object", async () => {
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk.connect([
            BridgeNetworks.Avalanche,
            BridgeNetworks.Ethereum,
            BridgeNetworks.Polygon
        ])

        expect(glitterSdk.getEvmNetwork(BridgeNetworks.Avalanche)).toBeTruthy()
        expect(glitterSdk.getEvmNetwork(BridgeNetworks.Ethereum)).toBeTruthy()
        expect(glitterSdk.getEvmNetwork(BridgeNetworks.Polygon)).toBeTruthy()
    });

    it("setRPC overrides SDK Connections", async () => {
        const mockRPC = "https://avalanche-glitter.com"
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk.setRPC(BridgeNetworks.Avalanche, mockRPC)
        glitterSdk.connect([
            BridgeNetworks.Avalanche,
        ])

        const connect = glitterSdk.getEvmNetwork(BridgeNetworks.Avalanche);
        expect(connect?.config.rpcUrl).toEqual(mockRPC)
    });
});
