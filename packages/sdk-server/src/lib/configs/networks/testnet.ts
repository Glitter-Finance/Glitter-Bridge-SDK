import { BridgeNetworks } from "@glitter-finance/sdk-core";
import { GlitterServerConfig } from "../config";

export const ServerTestnet:GlitterServerConfig = {
    chainAPIs: [
        {
            network: BridgeNetworks.solana,
            API_KEY:"",
            API_URL:"",
            RPC:"https://rpc.ankr.com/solana_devnet/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        },
        {
            network: BridgeNetworks.Ethereum,
            API_KEY:"KFB8N9P888F3X2JN8JFABT1A1YDBG5SSU4",
            API_URL:"https://api-goerli.etherscan.io/",
            RPC:"https://rpc.ankr.com/eth_goerli/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        },
        {
            network: BridgeNetworks.Avalanche,
            API_KEY:"FAPX56GH9C9XK5W4XIP2TM59DQJT2M7T52",
            API_URL:"https://api-testnet.snowtrace.io/",
            RPC:"https://rpc.ankr.com/avalanche_fuji-c/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        },
        {
            network: BridgeNetworks.Polygon,
            API_KEY:"TY3395R9I3VJKEK5S6SAQS4BHIPAY3ZNWD",
            API_URL:"https://api-testnet.polygonscan.com/",
            RPC:"https://rpc.ankr.com/polygon_mumbai/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        },
        {
            network: BridgeNetworks.Arbitrum,
            API_KEY:"VITESYMDPTRBBE91V4X14WPQCBVM9CKZCN",
            API_URL:"https://api-goerli.arbiscan.io/",
            RPC:"https://dawn-sly-lake.arbitrum-goerli.quiknode.pro/488afb79342f8bf91acd9d98e7a6320e08111b30/",
        },
        {
            network: BridgeNetworks.Binance,
            API_KEY:"FW5PPWE5K47G7GCR4HARCF7RC5XBIRS1F8",
            API_URL:"https://api-testnet.bscscan.com/",
            RPC:"https://old-divine-lake.bsc-testnet.quiknode.pro/88530546859aad71123f340a7f0dadcc5d1544c8/",
        },
        {
            network: BridgeNetworks.Zkevm,
            API_KEY:"NMWQI2U7PGXAB4DNV4GUW51S78FP37AAJY",
            API_URL:"https://api-testnet-zkevm.polygonscan.com/",
            RPC:"https://fittest-soft-snowflake.zkevm-testnet.quiknode.pro/2fbed77506b88b6da76fc6c8bca309c4bf28ae59/",
        }
    ]
}