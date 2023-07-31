import { BridgeNetworks, ChainRPCConfigs } from "@glitter-finance/sdk-core";

export const mainnetAPI: ChainRPCConfigs = {
    chainAPIs: [
        {
            network: BridgeNetworks.solana,
            API_KEY: "",
            API_URL: "",
            RPC: "https://api.mainnet-beta.solana.com",
        },
        {
            network: BridgeNetworks.Ethereum,
            API_KEY: "",
            API_URL: "https://api.etherscan.io/",
            RPC: "https://rpc.ankr.com/eth",
        },
        {
            network: BridgeNetworks.Avalanche,
            API_KEY: "",
            API_URL: "https://api.snowtrace.io/",
            RPC: "https://rpc.ankr.com/avalanche",
        },
        {
            network: BridgeNetworks.Polygon,
            API_KEY: "",
            API_URL: "https://api.polygonscan.com/",
            RPC: "https://rpc.ankr.com/polygon",
        },
        {
            network: BridgeNetworks.TRON,
            API_KEY: "",
            API_URL: "",
            RPC: "https://api.trongrid.io"
        },
        {
            network: BridgeNetworks.Arbitrum,
            API_KEY: "",
            API_URL: "https://api.arbiscan.io/",
            RPC: "https://rpc.ankr.com/arbitrum",
        },
        {
            network: BridgeNetworks.Binance,
            API_KEY: "",
            API_URL: "https://api.bscscan.com/",
            RPC: "https://bsc-dataseed4.binance.org",
        },
        {
            network: BridgeNetworks.Zkevm,
            API_KEY: "",
            API_URL: "https://api-zkevm.polygonscan.com/",
            RPC: "https://zkevm-rpc.com",
        },
        {
            network: BridgeNetworks.Optimism,
            API_KEY: "",
            API_URL: "https://api-optimistic.etherscan.io/",
            RPC: "https://rpc.ankr.com/optimism",
        }
    ],
    CMC_API: ""
}