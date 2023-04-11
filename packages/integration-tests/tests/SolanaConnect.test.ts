import {SolanaConnect, BridgeNetworks, GlitterBridgeSDK, GlitterEnvironment, SolanaAccount} from "@glitter-finance/sdk-core";
import {PublicKey, Transaction} from "@solana/web3.js";

describe("SolanaConnect", () => {
    let glitterSdk: GlitterBridgeSDK;
    let solConnect: SolanaConnect
    const supportedAssetSymbols = [
        // 'USDC',
        // 'xALGO', NO TOKEN ACCOUNT OF NEW GENERATED ACC
        'SOL',
    ];
    let solAccount: SolanaAccount;
    const targetAlgoAccount = "";
    const targetEvmAccount = "0x98729c03c4D5e820F5e8c45558ae07aE63F97461"
    const targetTronAccount = "TBXzzyYNNbtUgJZVcVbbMPhurN2oQvLsfk"

    beforeAll(async () => {
        glitterSdk = new GlitterBridgeSDK();
        glitterSdk.setEnvironment(GlitterEnvironment.testnet)
        glitterSdk = glitterSdk.connect([BridgeNetworks.solana]);
        solConnect = glitterSdk.solana!
        solAccount = await solConnect.accountStore.createNew()
    });

    it("Provides solana network connections", async () => {
        expect(solConnect.connections.devnet).toBeTruthy()
        expect(solConnect.connections.testnet).toBeTruthy()
        expect(solConnect.connections.mainnet).toBeTruthy()

        const latestBlockhashDevnet = await solConnect.connections.devnet.getLatestBlockhash()
        const latestBlockhashTestnet = await solConnect.connections.testnet.getLatestBlockhash()
        const latestBlockhashMainnet = await solConnect.connections.mainnet.getLatestBlockhash()

        expect(latestBlockhashDevnet).toBeTruthy()
        expect(latestBlockhashTestnet).toBeTruthy()
        expect(latestBlockhashMainnet).toBeTruthy()
    })

    it("Provides Solana Config", async () => {
        expect(solConnect.solanaConfig).toBeTruthy()
    })

    it("Should generate a correct sol account", async () => {
        expect(solAccount).toBeTruthy()
        expect(solAccount.pk).toBeInstanceOf(PublicKey)
        expect(solAccount.addr).toBeTruthy()
    })

    it("Provides Solana AccountStore", async () => {
        expect(solConnect.accountStore).toBeTruthy()
    })

    it("Provides supported tokens", async () => {
        for (const symbol of supportedAssetSymbols) {
            const token = solConnect.getToken(symbol)
            expect(token).toBeTruthy()
            expect(token?.decimals).toBeGreaterThan(0)
            if (token?.minTransfer) {
                expect(token.minTransfer).toBeGreaterThan(0)
            }
            expect(token?.name).toBeTruthy()
            expect(token?.symbol).toBeTruthy()
            expect(token?.symbol).toEqual(symbol)
        }
    })

    it("Provides token balance", async () => {
        for (const symbol of supportedAssetSymbols) {
            const token = solConnect.getToken(symbol)
            const balance = await solConnect.getBalance(solAccount.addr, token!.symbol)
            expect(balance.balanceHuman.toString()).toEqual("0")
        }
    })

    /** This test will fail if executed with an account
     * which does not have token account of USDC
     */
    it("Should provide USDC Bridge transaction", async () => {
        const TOKEN = "USDC"
        const amount = BigInt(1000000)
        let destinationNetwork = BridgeNetworks.algorand;

        let bridgeTx = await solConnect.bridgeTransaction(
            solAccount.addr,
            targetAlgoAccount,
            destinationNetwork,
            TOKEN,
            amount
        )

        expect(bridgeTx).toBeTruthy()
        expect(bridgeTx).toBeInstanceOf(Transaction)

        destinationNetwork = BridgeNetworks.Avalanche
        bridgeTx = await solConnect.bridgeTransaction(
            solAccount.addr,
            targetEvmAccount,
            destinationNetwork,
            TOKEN,
            amount
        )

        expect(bridgeTx).toBeTruthy()
        expect(bridgeTx).toBeInstanceOf(Transaction)

        destinationNetwork = BridgeNetworks.TRON
        bridgeTx = await solConnect.bridgeTransaction(
            solAccount.addr,
            targetTronAccount,
            destinationNetwork,
            TOKEN,
            amount
        )

        expect(bridgeTx).toBeTruthy()
        expect(bridgeTx).toBeInstanceOf(Transaction)
    })

    it("Should not be opted in a new account", async () => {
        const TOKEN = "USDC"
        let isOptedIn = await solConnect.isOptedIn(
            TOKEN,
            solAccount.pk.toBase58()
        )

        expect(isOptedIn).toBeFalsy()

        isOptedIn = await solConnect.isOptedIn(
            TOKEN,
            "CXaTaTRKjXFhjfDYzAxyeQRgFcjbqAvpbhBdNDNBQjQR"
        )

        expect(isOptedIn).toBeTruthy()

        expect(async () => await solConnect.isOptedIn(
            "SOL",
            "CXaTaTRKjXFhjfDYzAxyeQRgFcjbqAvpbhBdNDNBQjQR"
        )).rejects.toThrowError()
    })

});
