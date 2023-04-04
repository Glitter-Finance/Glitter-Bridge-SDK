import {BridgeNetworks} from "../networks";
import {
    BridgeTokenConfig,
    AlgorandStandardAssetConfig,
    AlgorandNativeTokenConfig,
} from "./types";

export class BridgeTokens {
    private static tokenConfig: Map<
    BridgeNetworks,
    Array<
      | BridgeTokenConfig
      | AlgorandStandardAssetConfig
      | AlgorandNativeTokenConfig
    >
  > = new Map();

    public static loadConfig(
        network: BridgeNetworks,
        config: Array<
      | BridgeTokenConfig
      | AlgorandStandardAssetConfig
      | AlgorandNativeTokenConfig
    >
    ) {
        this.tokenConfig.set(network, config);
    }

    public static getToken(network: BridgeNetworks.algorand, symbol: string): AlgorandStandardAssetConfig | AlgorandNativeTokenConfig;
    public static getToken(network: BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche, symbol: string): BridgeTokenConfig;
    public static getToken(network: BridgeNetworks, symbol: string) {
        const configToFind = this.tokenConfig.get(network);
        if (!configToFind) return undefined;
        const token = configToFind?.find((x) => x.symbol.toLowerCase() === symbol);
        if (!token) return undefined;
        switch (network) {
            case BridgeNetworks.solana:
                return token as BridgeTokenConfig;
            case BridgeNetworks.algorand:
                return token as AlgorandStandardAssetConfig | AlgorandNativeTokenConfig;
            case BridgeNetworks.Ethereum:
            case BridgeNetworks.Polygon:
            case BridgeNetworks.Avalanche:
            case BridgeNetworks.TRON:
                return token as BridgeTokenConfig;
        }
    }

    public static add(
        network: BridgeNetworks.algorand,
        config: Array<AlgorandStandardAssetConfig
      | AlgorandNativeTokenConfig>
    ): void;
    public static add(
        network: BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche,
        config: Array<BridgeTokenConfig>
    ): void;
    public static add(
        network: BridgeNetworks,
        config: Array<
      | BridgeTokenConfig
      | AlgorandStandardAssetConfig
      | AlgorandNativeTokenConfig
    >
    ) {
        const filtered = config.filter((x) => {
            if (network === BridgeNetworks.algorand) {
                return (
                    !!(x as AlgorandStandardAssetConfig).assetId ||
          (x as AlgorandNativeTokenConfig).isNative
                );
            } else {
                return !!(x as BridgeTokenConfig).address;
            }
        });

        this.addUpdateTokens(network, filtered);
    }

    private static addUpdateTokens(
        network: BridgeNetworks,
        config: Array<
      | BridgeTokenConfig
      | AlgorandStandardAssetConfig
      | AlgorandNativeTokenConfig
    >
    ) {
        const existingTokens = this.tokenConfig.get(network);
        if (existingTokens) {
            for (const token of config) {
                if (
                    !existingTokens.find(
                        (x) => x.symbol.toLowerCase() === token.symbol.toLowerCase()
                    )
                ) {
                    existingTokens.push(token);
                }
            }
        } else {
            this.tokenConfig.set(network, config);
        }
    }
}
