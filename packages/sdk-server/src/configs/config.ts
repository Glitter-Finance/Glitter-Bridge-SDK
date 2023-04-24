import { BridgeNetworks } from "@glitter-finance/sdk-core";

export type GlitterServerConfig = {
    chainAPIs: ChainAPIConfig[];
}
export type ChainAPIConfig = {
    network: BridgeNetworks;
    API_KEY: string;
    API_URL: string;
    RPC: string;
}