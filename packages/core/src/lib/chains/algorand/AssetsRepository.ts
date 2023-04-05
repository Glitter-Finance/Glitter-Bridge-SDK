import {Algodv2} from "algosdk";
import {AlgorandNativeTokenConfig, AlgorandStandardAssetConfig} from "../../common";
import {AlgorandAssetMetadata} from "./types";

export class AssetsRepository {
    protected __metadata: Map<
    string,
    AlgorandAssetMetadata & AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
  >;
    protected __algoClient: Algodv2;

    constructor(client: Algodv2) {
        this.__algoClient = client;
        this.__metadata = new Map();
    }

    async addStandardAsset(
        tokenConfig: AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
    ) {
        this.__metadata.set(tokenConfig.symbol, {
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
        if ((tokenConfig as AlgorandStandardAssetConfig).assetId) {
            this.updateStandardAsset(tokenConfig as AlgorandStandardAssetConfig)
        }
    }

    private async updateStandardAsset(tokenConfig: AlgorandStandardAssetConfig) {
        try {
            const assetInfo = (await this.__algoClient
                .getAssetByID(tokenConfig.assetId)
                .do()) as AlgorandAssetMetadata;
            
            this.__metadata.set(assetInfo.params["unit-name"], {
                ...assetInfo,
                ...(tokenConfig as AlgorandStandardAssetConfig),
            });
        } catch (error: any) {
            console.error('Error', error.message)
        }
    }

    getAsset(
        tokenSymbol: string
    ): (AlgorandAssetMetadata & AlgorandStandardAssetConfig | AlgorandNativeTokenConfig) | undefined {
        return this.__metadata.get(tokenSymbol);
    }
}
