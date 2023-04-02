import {
    Connection
} from "@solana/web3.js";
import {SolanaConfig, SolanaPublicNetworks} from "./types";
import {SolanaAccountsStore} from "./AccountsStore";
import {GlitterBridgeConfig, GlitterEnvironment} from "src/types";

export class SolanaConnect {
    readonly defaultConnection?: "testnet" | "devnet" | "mainnet";
    readonly accountStore: SolanaAccountsStore;
    readonly solanaConfig: SolanaConfig;
    readonly connections: Record<"testnet" | "devnet" | "mainnet", Connection>;

    constructor(config: GlitterBridgeConfig) {
        this.defaultConnection = config.name === GlitterEnvironment.mainnet ? 
            "mainnet" : "testnet"
        this.connections = {
            devnet: new Connection(SolanaPublicNetworks.devnet.toString()),
            mainnet: new Connection(SolanaPublicNetworks.mainnet_beta.toString()),
            testnet: new Connection(SolanaPublicNetworks.testnet.toString())
        }
        this.accountStore = new SolanaAccountsStore(
            config.name === GlitterEnvironment.mainnet ?
                this.connections.mainnet : this.connections.testnet
        )
        this.solanaConfig = config.solana
    }

}
