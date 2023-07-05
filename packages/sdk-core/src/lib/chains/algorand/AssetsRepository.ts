import { Algodv2 } from "algosdk";
import { AlgorandNativeTokenConfig, AlgorandStandardAssetConfig } from "../../common";
import { AlgorandAssetMetadata } from "./types";

/**
 * Class representing an assets repository.
 */
export class AssetsRepository {
    protected __metadata: Map<
    string,
    AlgorandAssetMetadata & AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
  >;
    protected __algoClient: Algodv2;

    /**
     * Create an instance of AssetsRepository.
     *
     * @param {Algodv2} client - The Algodv2 client instance.
     */
    constructor(client: Algodv2) {
        this.__algoClient = client;
        this.__metadata = new Map();
    }

    /**
     * Adds a standard asset to the repository.
     *
     * @param {AlgorandStandardAssetConfig | AlgorandNativeTokenConfig} tokenConfig - The configuration object for the standard asset.
     * @returns {void}
     */
    async addStandardAsset(
        tokenConfig: AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
    ) {
        this.__metadata.set(tokenConfig.symbol.toLowerCase(), {
            ...tokenConfig,
            index: (tokenConfig as AlgorandStandardAssetConfig).assetId,
            params: {
                creator: "",
                decimals: tokenConfig.decimals,
                "default-frozen": false,
                freeze: "",
                manager: "",
                name: tokenConfig.name,
                "name-b64": "",
                reserve: "",
                total: 0,
                "unit-name": tokenConfig.symbol,
                "unit-name-b64": "",
                url: "",
                "url-b64": ""
            }
        })
    }

    /**
     * Updates a standard asset in the repository.
     *
     * @param {AlgorandStandardAssetConfig} tokenConfig - The updated configuration object for the standard asset.
     * @returns {void}
     */
    public async updateStandardAsset(tokenConfig: AlgorandStandardAssetConfig) {
        const assetInfo = (await this.__algoClient
            .getAssetByID(tokenConfig.assetId)
            .do()) as AlgorandAssetMetadata;
            
        const metadata = {
            ...assetInfo,
            ...(tokenConfig as AlgorandStandardAssetConfig),
        }

        const lowerCase = assetInfo.params["unit-name"].toLowerCase()
        this.__metadata.set(lowerCase, metadata);

        return metadata
    }

    getAsset(
        tokenSymbol: string
    ): (AlgorandAssetMetadata & AlgorandStandardAssetConfig | AlgorandNativeTokenConfig) | undefined {
        return this.__metadata.get(tokenSymbol.toLowerCase());
    }
}
