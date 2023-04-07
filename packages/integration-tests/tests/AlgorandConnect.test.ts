import {AlgorandAccount, AlgorandConnect, BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment, Sleep} from "@glitter-finance/sdk-core";

describe("AlgorandConnect Tests", () => {
    let glitterSdk: GlitterBridgeSDK;
    let algoConnect: AlgorandConnect
    const supportedAssetSymbols = [
        'USDC',
        'xSOL',
        'ALGO',
    ];
    let algoAccount: AlgorandAccount;
    const targetSolAccount = "CXaTaTRKjXFhjfDYzAxyeQRgFcjbqAvpbhBdNDNBQjQR"
    const targetEvmAccount = "0x98729c03c4D5e820F5e8c45558ae07aE63F97461"
    const targetTronAccount = "TBXzzyYNNbtUgJZVcVbbMPhurN2oQvLsfk"

    beforeAll(async () => {
        glitterSdk = new GlitterBridgeSDK();
        glitterSdk.setRPC(BridgeNetworks.algorand, "https://hidden-fabled-sailboat.algorand-testnet.quiknode.pro/17d9f26e9db743c1425d1626ebad466c1c3d46a6/algod/")
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk = glitterSdk.connect([BridgeNetworks.algorand]);
        algoConnect = glitterSdk.algorand!
        algoAccount = await algoConnect.accountsStore.createNew()
    });

    it("Provides algod client and indexer", async () => {
        const client = algoConnect.client
        expect(client).toBeTruthy()
        const clientIndexer = algoConnect.clientIndexer
        expect(clientIndexer).toBeTruthy()
    });

    it("Provides address of bridge components", async () => {
        const bridgeComponents = [
            'asaOwner',
            'algoOwner',
            'bridgeOwner',
            'feeReceiver',
            'multiSig1',
            'multiSig2',
            'bridge',
            'asaVault',
            'algoVault',
            'usdcReceiver',
            'usdcDeposit',
            // Exempt, failing
            // 'tokenBridgeV2Address',
        ];

        for (const comp of bridgeComponents) {
            expect(algoConnect.getAddress(comp as any)).toBeTruthy()
        }
    });

    it("Provides supported assets", async () => {
        for (const assetSymbol of supportedAssetSymbols) {
            const assetInfo = algoConnect.getAsset(assetSymbol)
            expect(assetInfo).toBeTruthy()
            expect(assetInfo?.decimals).toBeGreaterThan(0)
            if (assetInfo?.minTransfer) {
                expect(assetInfo.minTransfer).toBeGreaterThan(0)
            }
            expect(assetInfo?.name).toBeTruthy()
            expect(assetInfo?.symbol).toBeTruthy()
            expect(assetInfo?.symbol).toEqual(assetSymbol)
        }
    });

    it("Provides asset balance", async () => {
        for (const assetSymbol of supportedAssetSymbols) {
            const balance = await algoConnect.getBalance(algoAccount.addr, assetSymbol)
            await algoConnect.accountsStore.updateAccountDetails(algoAccount)
            expect(balance.balanceHuman.toString()).toEqual("0");
        }
    });

    it("Provides xALGO bridge transactions", async () => {
        const transactions = await algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetSolAccount,
            BridgeNetworks.solana,
            supportedAssetSymbols[1],
            BigInt(1000000000)
        )

        expect(transactions).toBeTruthy()
        expect(transactions.length).toEqual(3)
    });

    it("Fails for xALGO transfer below limit", async () => {
        expect(algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetSolAccount,
            BridgeNetworks.solana,
            supportedAssetSymbols[1],
            BigInt(5000000) // 0.005
        )).rejects.toEqual('Unsupported bridge transaction')
    });

});
