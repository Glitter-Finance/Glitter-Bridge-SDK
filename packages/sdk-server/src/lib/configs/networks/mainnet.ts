import { BridgeNetworks } from "@glitter-finance/sdk-core";
import { GlitterServerConfig } from "../config";

export const ServerMainnet:GlitterServerConfig = {
    chainAPIs: [
        {
            network: BridgeNetworks.solana,
            API_KEY:"",
            API_URL:"",
            RPC:"https://rpc.ankr.com/solana/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        },
        {
            network: BridgeNetworks.Ethereum,
            API_KEY:"KFB8N9P888F3X2JN8JFABT1A1YDBG5SSU4",
            API_URL:"https://api.etherscan.io/",
            RPC:"https://rpc.ankr.com/eth/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        },
        {
            network: BridgeNetworks.Avalanche,
            API_KEY:"FAPX56GH9C9XK5W4XIP2TM59DQJT2M7T52",
            API_URL:"https://api.snowtrace.io/",
            RPC:"https://rpc.ankr.com/avalanche-c/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        },
        {
            network: BridgeNetworks.Avalanche,
            API_KEY:"TY3395R9I3VJKEK5S6SAQS4BHIPAY3ZNWD",
            API_URL:"https://api.polygonscan.com/",
            RPC:"https://rpc.ankr.com/polygon/16a70be27401891b383d43c3e3f1f453ed3daef7c55dc89f051ff1e2fd3c770c",
        }
    ]
}