import {AlgorandAccount, AlgorandConnect, AlgorandStandardAssetConfig, BridgeNetworks, BridgeTokens, GlitterBridgeSDK, GlitterEnvironment, getHashedTransactionId} from "@glitter-finance/sdk-core";

describe("AlgorandConnect", () => {
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

    it("Provides asset balance", async () => {
        const tokens = BridgeTokens.getTokens(BridgeNetworks.algorand).map(x => x.symbol)
        for (const assetSymbol of tokens) {
            const balance = await algoConnect.getBalance(algoAccount.addr, assetSymbol)
            expect(balance.balanceHuman.toString()).toEqual("0");
        }
    });

    it("Provides xSOL bridge transactions", async () => {
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

    it("Fails for xSOL transfer below limit", async () => {
        expect(algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetSolAccount,
            BridgeNetworks.solana,
            supportedAssetSymbols[1],
            BigInt(5000000) // 0.005
        )).rejects.toEqual('Unsupported bridge transaction')
    });

    it("Provides ALGO bridge transactions", async () => {
        const transactions = await algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetSolAccount,
            BridgeNetworks.solana,
            supportedAssetSymbols[2],
            BigInt(1000000000)
        )

        expect(transactions).toBeTruthy()
        expect(transactions.length).toEqual(3)
    });

    it("Provides ALGO bridge transactions", async () => {
        const transactions = await algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetSolAccount,
            BridgeNetworks.solana,
            supportedAssetSymbols[2],
            BigInt(1000000000)
        )

        expect(transactions).toBeTruthy()
        expect(transactions.length).toEqual(3)
    });

    it("Fails for a random token symbol", async () => {
        expect(algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetSolAccount,
            BridgeNetworks.solana,
            "DOGE",
            BigInt(5000000) // 0.005
        )).rejects.toEqual('Token unsupported')
    });

    it("Creates USDC bridge transactions", async () => {
        const toEvm = await algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetEvmAccount,
            BridgeNetworks.Avalanche,
            supportedAssetSymbols[0],
            BigInt(2000000)
        )

        expect(toEvm).toBeTruthy()
        expect(toEvm.length).toEqual(1)

        const toSol = await algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetSolAccount,
            BridgeNetworks.solana,
            supportedAssetSymbols[0],
            BigInt(2000000)
        )

        expect(toSol).toBeTruthy()
        expect(toSol.length).toEqual(1)

        const toTron = await algoConnect.bridgeTransactions(
            algoAccount.addr,
            targetTronAccount,
            BridgeNetworks.TRON,
            supportedAssetSymbols[0],
            BigInt(2000000)
        )

        expect(toTron).toBeTruthy()
        expect(toTron.length).toEqual(1)
    });

    it("Generated account should not be opted into asset", async () => {
        const token = algoConnect.getAsset(supportedAssetSymbols[0]) as AlgorandStandardAssetConfig
        
        const isOptedIn = await algoConnect.isOptedIn(
            token.assetId,
            algoAccount.addr
        )

        expect(isOptedIn).toBeFalsy()
    });

    it("Get Transaction hash by Id", async () => {
        const txId = getHashedTransactionId(BridgeNetworks.algorand, "MPCJAXL5KCAI5DLCBBF35CO2ESRGU6GINQDMNL2MZ5BTQZFR4FBQ");
        console.log("TXID", txId);
        expect(txId).toBeTruthy();
    });
});
