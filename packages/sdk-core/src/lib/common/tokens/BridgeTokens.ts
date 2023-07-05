import { BridgeNetworks } from "../networks";
import {
    BridgeTokenConfig,
    AlgorandStandardAssetConfig,
    AlgorandNativeTokenConfig,
} from "./types";

/**
 * Represents a class that manages bridge tokens. (V1 + Circle Bridge)
 *
 * @class BridgeTokens
 */
export class BridgeTokens {
    private static tokenConfig: Map<
    BridgeNetworks,
    Array<
      | BridgeTokenConfig
      | AlgorandStandardAssetConfig
      | AlgorandNativeTokenConfig
    >
  > = new Map();

    /**
     * Loads the bridge token configuration for the specified network.
     *
     * @static
     * @function loadConfig
     * @param {BridgeNetworks} network - The network for which to load the bridge token configuration.
     * @param {Array<BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>} config - The bridge token configuration array.
     * @returns {void}
     */
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

    /**
     * Retrieves the tokens for the specified network.
     *
     * @static
     * @function getTokens
     * @param {BridgeNetworks.algorand} network - The Algorand network for which to retrieve the tokens.
     * @returns {Array<AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>} - The array of tokens for the Algorand network.
     * @param {BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche} network - The network for which to retrieve the tokens.
     * @returns {Array<BridgeTokenConfig>} - The array of tokens for the specified network.
     * @param {BridgeNetworks} network - The network for which to retrieve the tokens.
     * @returns {Array<BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>} - The array of tokens for the specified network.
     */
    public static getTokens(network: BridgeNetworks.algorand): Array<AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>;
    public static getTokens(network: BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche): Array<BridgeTokenConfig>;
    public static getTokens(network: BridgeNetworks): Array<BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>;
    public static getTokens(network: BridgeNetworks): Array<BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig> {
        return this.tokenConfig.get(network) ?? [];
    }

    /**
     * Retrieves the token with the specified symbol for the specified network.
     *
     * @static
     * @function getToken
     * @param {BridgeNetworks.algorand} network - The Algorand network for which to retrieve the token.
     * @param {string} symbol - The symbol of the token to retrieve.
     * @returns {AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined} - The token with the specified symbol for the Algorand network, or undefined if not found.
     * @param {BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche} network - The network for which to retrieve the token.
     * @param {string} symbol - The symbol of the token to retrieve.
     * @returns {BridgeTokenConfig | undefined} - The token with the specified symbol for the specified network, or undefined if not found.
     * @param {BridgeNetworks} network - The network for which to retrieve the token.
     * @param {string} symbol - The symbol of the token to retrieve.
     * @returns {BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined} - The token with the specified symbol for the specified network, or undefined if not found.
     */
    public static getToken(network: BridgeNetworks.algorand, symbol: string): AlgorandStandardAssetConfig | AlgorandNativeTokenConfig;
    public static getToken(network: BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche, symbol: string): BridgeTokenConfig;
    public static getToken(network: BridgeNetworks, symbol: string): BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined;
    public static getToken(network: BridgeNetworks, symbol: string) {
        const configToFind = this.tokenConfig.get(network);
        if (!configToFind) return undefined;
        const token = configToFind?.find((x) => x.symbol.toLowerCase() === symbol.toLowerCase());
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

    /**
     * Retrieves the token associated with the specified address for the specified network.
     *
     * @static
     * @function getFromAddress
     * @param {BridgeNetworks.algorand} network - The Algorand network for which to retrieve the token.
     * @param {string} address - The address associated with the token to retrieve.
     * @returns {AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined} - The token associated with the specified address for the Algorand network, or undefined if not found.
     * @param {BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche} network - The network for which to retrieve the token.
     * @param {string} address - The address associated with the token to retrieve.
     * @returns {BridgeTokenConfig | undefined} - The token associated with the specified address for the specified network, or undefined if not found.
     * @param {BridgeNetworks} network - The network for which to retrieve the token.
     * @param {string} address - The address associated with the token to retrieve.
     * @returns {BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined} - The token associated with the specified address for the specified network, or undefined if not found.
     */
    public static getFromAddress(network: BridgeNetworks.algorand, address: string): AlgorandStandardAssetConfig | AlgorandNativeTokenConfig;
    public static getFromAddress(network: BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche, address: string): BridgeTokenConfig;
    public static getFromAddress(network: BridgeNetworks, address: string): BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig | undefined;
    public static getFromAddress(network: BridgeNetworks, address: string) {
        const configToFind = this.tokenConfig.get(network);
        if (!configToFind) return undefined;
        
        let token ;
        switch (network) {
            case BridgeNetworks.solana:
                token = (configToFind as BridgeTokenConfig[]).find((x) => x.address.toLowerCase() === address.toLowerCase());
                return token as BridgeTokenConfig;
            case BridgeNetworks.algorand:
                token = (configToFind as (AlgorandStandardAssetConfig | AlgorandNativeTokenConfig)[]).find((x) => {
                    if ((x as AlgorandStandardAssetConfig).assetId) {
                        return (x as AlgorandStandardAssetConfig).assetId.toString() === address;
                    } else {
                        return (x as AlgorandNativeTokenConfig).isNative;
                    }                    
                }); 
                return token as AlgorandStandardAssetConfig | AlgorandNativeTokenConfig;
            case BridgeNetworks.Ethereum:
            case BridgeNetworks.Polygon:
            case BridgeNetworks.Avalanche:
            case BridgeNetworks.TRON:
                token = (configToFind as BridgeTokenConfig[]).find((x) => x.address.toLowerCase() === address.toLowerCase());
                return token as BridgeTokenConfig;
        }
    }

    /**
     * Adds tokens to the bridge token configuration for the specified network.
     *
     * @static
     * @function add
     * @param {BridgeNetworks.algorand} network - The Algorand network for which to add the tokens.
     * @param {Array<AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>} config - The Algorand token configuration array.
     * @returns {void}
     * @param {BridgeNetworks.solana | BridgeNetworks.Ethereum | BridgeNetworks.TRON | BridgeNetworks.Polygon | BridgeNetworks.Avalanche} network - The network for which to add the tokens.
     * @param {Array<BridgeTokenConfig>} config - The token configuration array.
     * @returns {void}
     * @param {BridgeNetworks} network - The network for which to add the tokens.
     * @param {Array<BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>} config - The token configuration array.
     * @returns {void}
     */
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

    /**
     * Adds or updates tokens in the bridge token configuration for the specified network.
     *
     * @private
     * @static
     * @function addUpdateTokens
     * @param {BridgeNetworks} network - The network for which to add or update the tokens.
     * @param {Array<BridgeTokenConfig | AlgorandStandardAssetConfig | AlgorandNativeTokenConfig>} config - The token configuration array.
     * @returns {void}
     */
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
