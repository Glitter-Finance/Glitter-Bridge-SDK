import {Algodv2} from "algosdk";
import {AlgorandNativeTokenConfig, AlgorandStandardAssetConfig} from "src/lib/common";
import {AlgorandAssetMetadata} from "./types";

export class AssetsRepository {
    protected __metadata: Map<
    string,
    AlgorandAssetMetadata & AlgorandStandardAssetConfig
  >;
    protected __algoClient: Algodv2;

    constructor(client: Algodv2) {
        this.__algoClient = client;
        this.__metadata = new Map();
    }

    async addStandardAsset(
        assetId: number,
        tokenConfig: AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
    ) {
        if ((tokenConfig as AlgorandStandardAssetConfig).assetId) {
            const assetInfo = (await this.__algoClient
                .getAssetByID(assetId)
                .do()) as AlgorandAssetMetadata;
        
            this.__metadata.set(assetInfo.params["unit-name"], {
                ...assetInfo,
                ...(tokenConfig as AlgorandStandardAssetConfig),
            });
        }
    }

    getAsset(
        tokenSymbol: string
    ): (AlgorandAssetMetadata & AlgorandStandardAssetConfig) | undefined {
        return this.__metadata.get(tokenSymbol);
    }
}
