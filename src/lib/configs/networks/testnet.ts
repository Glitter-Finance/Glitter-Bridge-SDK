import { BridgeNetworks } from "../../common/networks/networks";
import { GlitterBridgeConfig } from "../config";

export const BridgeTestnet: GlitterBridgeConfig = {
  name: "testnet",
  algorand: {
    name: "Algorand",
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
      usdcReceiver:
        "JJWJKLUIMX3THW3CT6ZQMBRPBQ34MUFNS7PFV4YU7CCLS2KPUBOS7XFJDY",
      usdcDeposit: "BPINJM3HKNDA2XU3FUARSRTXDZXYSK5AQXITGDED4T6RRLQPZX7SRRKXHI",
      bridge: "XJQ25THCV734QIUZARPZGG3NPRFZXTIIU77JSJBT23TJMGL3FXJWVR57OQ",
      asaVault: "U4A3YARBVMT7PORTC3OWXNC75BMGF6TCHFOQY4ZSIIECC5RW25SVKNKV3U",
      algoVault: "R7VCOR74LCUIFH5WKCCMZOS7ADLSDBQJ42YURFPDT3VGYTVNBNG7AIYTCQ",
    },
    tokens: [
      {
        network: "algorand",
        symbol: "ALGO",
        address: "",
        decimals: 6,
        min_transfer: 5,
        fee_divisor: 200,
        name: undefined,
        max_transfer: undefined,
        total_supply: undefined,
      },
      {
        network: "algorand",
        symbol: "USDC",
        address: 10458941,
        decimals: 6,
        min_transfer: 5,
        fee_divisor: 200,
        name: undefined,
        max_transfer: undefined,
        total_supply: undefined,
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
        total_supply: undefined,
      }
    ],
  },
  solana: {
    name: "Solana",
    server: "https://api.testnet.solana.com",
    accounts: {
      bridgeProgram: "GLittnj1E7PtSF5thj6nYgjtMvobyBuZZMuoemXpnv3G",
      vestingProgram: "EMkD74T2spV3A71qfY5PNqVNrNrpbFcdwMF2TerRMr9n",
      owner: "hY5PXHYm58H5KtJW4GrtegxXnpMruoX3LLP6CufHoHj",
      usdcReceiver: "Av47VxT8GpGXHYc3aG7fKddgZjCuZEb5yF3BCaXyE7wu",
      usdcReceiverTokenAccount: "HrrpuLCq2ewozVZU5sFrWL6oRvFe8KH1VMhVQLCcWpdy",
      usdcDeposit: "8Cb6eKCiowqsfYoLeaQf9voTHv1nV6rKjBvMQwLEGoDJ",
      usdcDepositTokenAccount: "CWmY521qXB29Hwp3WBzyX1huApRdQu4kjrcxZpa2St7d",
      memoProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
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
        total_supply: undefined,
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
        total_supply: undefined,
      },
      {
        network: "solana",
        symbol: "USDC",
        address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        decimals: 6,
        min_transfer: 1,
        fee_divisor: 200,
        name: undefined,
        max_transfer: undefined,
        total_supply: undefined,
      }
    ],
  },
  evm: {
    [BridgeNetworks.Avalanche]: {
      bridge: "0x07c48413bEA695Ef37a75Be8A09ec84A4c8a6bc1",
      rpcUrl: "https://rpc.ankr.com/avalanche_fuji",
      tokens: [
        {
          address: "0x5425890298aed601595a70AB815c96711a31Bc65",
          symbol: "USDC",
          decimals: 6,
          name: "USD Coin",
        },
      ],
      depositWallet: "0x2f34c32e1380306bc3f359d836d6c937cbe90337",
      releaseWallet: "0x6D57268BE8EBa2dF18f07267cfF4e114933da429",
      chainId: 43113,
    },
    [BridgeNetworks.Ethereum]: {
      bridge: "0xc918b9719A0e04Df45842eec88FC84480266b568",
      rpcUrl: "https://rpc.ankr.com/eth_goerli",
      tokens: [
        {
          address: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
          symbol: "USDC",
          decimals: 6,
          name: "USD Coin",
        },
      ],
      depositWallet: "0x6f5990a1b679190bcd0670f5006f14621f88805d",
      releaseWallet: "0x7c10Ee260F6d408aC0c9f297A16808ca407e469E",
      chainId: 5,
    },
    [BridgeNetworks.Polygon]: {
      bridge: "0xA870B28c23F2358971dC1FF93bC2a2Ec908A6D33",
      rpcUrl: "https://rpc.ankr.com/polygon_mumbai",
      tokens: [
        {
          address: "0x0fa8781a83e46826621b3bc094ea2a0212e71b23",
          symbol: "USDC",
          decimals: 6,
          name: "USD Coin",
        },
      ],
      depositWallet: "0x8eb550b1958e716c4051469425d56e79282afa2f",
      releaseWallet: "0xEAFA843b04A5847ec463358FC499347435354D3D",
      chainId: 80001,
    },
  },
  stellar: {
    accounts: {
      usdcDepositAddress: "",
      usdcDepositTag: "",
      usdcReceiverAddress: "",
      usdcReceiverTag: ""
    }
  },
  hedera: {
    accounts: {
      usdcDepositAddress: "",
      usdcDepositTag: "",
      usdcReceiverAddress: "",
      usdcReceiverTag: ""
    }
  },
  tron: {
    tokens: [
      {
        address: "TFGBSrddCjLJAwuryZ9DUxtEmKv13BPjnh",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6
      }
    ],
    fullNode: "https://api.shasta.trongrid.io",
    solidityNode: "https://api.shasta.trongrid.io",
    eventServer: "https://api.shasta.trongrid.io",
    addresses: {
      bridge: "TG5L1sypor6QsvEWdF5zVQR48Fd4B73P3E",
      depositWallet: "TXpEeQDe6UenfjkhG9Y3HPMjuXQGukpJq8",
      releaseWallet: "TEWifyy5yrm7zWbWBs5RVbLyZm4JPiawpf"
    }
  },
  flow: {
    accounts: {
      usdcDeposit: "",
      usdcReceiver: "",
    }
  }
};
