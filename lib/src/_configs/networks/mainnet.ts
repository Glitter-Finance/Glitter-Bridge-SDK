import { GlitterBridgeConfig } from "../config";

export const BridgeMainnet: GlitterBridgeConfig = {
    name: "mainnet",
    algorand: {
        name: "mainnet",
        serverUrl: "https://node.algoexplorerapi.io",
        serverPort: "",
        indexerUrl: "https://algoindexer.algoexplorerapi.io",
        indexerPort: "",
        nativeToken: "",
        appProgramId: 813301700,
        accounts: {
            asaOwner: "A3OSGEZJVBXWNXHZREDBB5Y77HSUKA2VS7Y3BWHWRBDOWZ5N4CWXPVOHZE",
            algoOwner: "5TFPIJ5AJLFL5IBOO2H7QXYLDNJNSQYTZJOKISGLT67JF6OYZS42TRHRJ4",
            bridgeOwner: "HUPQIOAF3JZWHW553PGBKWXYSODFYUG5MF6V246TIBW66WVGOAEB7R6XAE",
            feeReceiver: "A2GPNMIWXZDD3O3MP5UFQL6TKAZPBJEDZYHMFFITIAJZXLQH37SJZUWSZQ",
            multiSig1: "JPDV3CKFABIXDVH36E7ZBVJ2NC2EQJIBEHCKYTWVC4RDDOHHOPSBWH3QFY",
            multiSig2: "DFFTYAB6MWMRTZGHL2GAP7TMK7OUGHDD2AACSO7LXSZ7SY2VLO3OEOJBQU",
            usdcReceiver: "GUSN5SEZQTM77WE2RMNHXRAKP2ELDM7GRLOEE3GJWNS5BMACRK7JVS3PLE",
            usdcDeposit: "O7MYJZR3JQS5RYFJVMW4SMXEBXNBPQCEHDAOKMXJCOUSH3ZRIBNRYNMJBQ",
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
            address: 31566704,
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
            address: 792313023,
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
            usdcReceiver: "GUsVsb8R4pF4T7Bo83dkzhKeY5nGd1vdpK4Hw36ECbdK",
            usdcDeposit: "9i8vhhLTARBCd7No8MPWqJLKCs3SEhrWKJ9buAjQn6EM",
            memoProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
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
                address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
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