import { GlitterBridgeConfig } from "../config";

export const BridgeTestnet: GlitterBridgeConfig = {
    name: "mainnet",
    algorand: {
        name: "mainnet",
        serverUrl: "https://node.testnet.algoexplorerapi.io",
        serverPort: "",
        indexerUrl: "https://algoindexer.testnet.algoexplorerapi.io",
        indexerPort: "",
        nativeToken: "",
        appProgramId: 98624397,
        accounts: {
            asaOwner: "A3OSGEZJVBXWNXHZREDBB5Y77HSUKA2VS7Y3BWHWRBDOWZ5N4CWXPVOHZE",
            algoOwner: "5TFPIJ5AJLFL5IBOO2H7QXYLDNJNSQYTZJOKISGLT67JF6OYZS42TRHRJ4",
            bridgeOwner: "HUPQIOAF3JZWHW553PGBKWXYSODFYUG5MF6V246TIBW66WVGOAEB7R6XAE",
            feeReceiver: "A2GPNMIWXZDD3O3MP5UFQL6TKAZPBJEDZYHMFFITIAJZXLQH37SJZUWSZQ",
            multiSig1: "JPDV3CKFABIXDVH36E7ZBVJ2NC2EQJIBEHCKYTWVC4RDDOHHOPSBWH3QFY",
            multiSig2: "DFFTYAB6MWMRTZGHL2GAP7TMK7OUGHDD2AACSO7LXSZ7SY2VLO3OEOJBQU",
            usdcReceiver: "",
            usdcDeposit: "",
            bridge:"XJQ25THCV734QIUZARPZGG3NPRFZXTIIU77JSJBT23TJMGL3FXJWVR57OQ",
            asaVault: "U4A3YARBVMT7PORTC3OWXNC75BMGF6TCHFOQY4ZSIIECC5RW25SVKNKV3U",
            algoVault: "R7VCOR74LCUIFH5WKCCMZOS7ADLSDBQJ42YURFPDT3VGYTVNBNG7AIYTCQ",
        },
        tokens: [{
            network: "algorand",
            symbol: "ALGO",
            address: "",
            decimals: 6,
            min_transfer: 5,
            fee_divisor: 200,
            name: undefined,
            max_transfer: undefined,
            total_supply: undefined
        },
        {
            network: "algorand",
            symbol: "USDC",
            address: undefined,
            decimals: 6,
            min_transfer: 5,
            fee_divisor: 200,
            name: undefined,
            max_transfer: undefined,
            total_supply: undefined
        },
        {
            network: "algorand",
            symbol: "xSOL",
            address: 31566704,
            decimals: 9,
            min_transfer: 0.05,
            fee_divisor: 200,
            name: undefined,
            max_transfer: undefined,
            total_supply: undefined
        }]
    },
    solana: {
        name: "mainnet-beta",
        server: "https://api.mainnet-beta.solana.com",
        accounts: {
            bridgeProgram: "GLittnj1E7PtSF5thj6nYgjtMvobyBuZZMuoemXpnv3G",
            vestingProgram: "EMkD74T2spV3A71qfY5PNqVNrNrpbFcdwMF2TerRMr9n",
            owner: "hY5PXHYm58H5KtJW4GrtegxXnpMruoX3LLP6CufHoHj",
            usdcReceiver: "",
            usdcDeposit: "",
            memoProgram: ""
        },
        tokens: [
            {
                network: "solana",
                symbol: "SOL",
                address: "11111111111111111111111111111111",
                decimals: 9,
                min_transfer: 0.05,
                fee_divisor: 200,
                name: undefined,
                max_transfer: undefined,
                total_supply: undefined
            },
            {
                network: "solana",
                symbol: "xALGO",
                address: "xALGoH1zUfRmpCriy94qbfoMXHtK6NDnMKzT4Xdvgms",
                decimals: 6,
                min_transfer: 5,
                fee_divisor: 200,
                name: undefined,
                max_transfer: undefined,
                total_supply: undefined
            },
            {
                network: "solana",
                symbol: "USDC",
                address: "",
                decimals: 6,
                min_transfer: 1,
                fee_divisor: 200,
                name: undefined,
                max_transfer: undefined,
                total_supply: undefined
            }
        ]

    }
}