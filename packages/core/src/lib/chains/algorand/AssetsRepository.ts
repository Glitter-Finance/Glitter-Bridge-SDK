import {Algodv2, Indexer} from "algosdk";
import {AlgorandNativeTokenConfig, AlgorandStandardAssetConfig} from "../../../lib/common";
import {AlgorandAssetMetadata} from "./types";

export class AssetsRepository {
    protected __metadata: Map<
    string,
    AlgorandAssetMetadata & AlgorandStandardAssetConfig
  >;
    protected __algoClient: Algodv2;
    protected __algoIndexer: Indexer;

    constructor(client: Algodv2, clientIndexer: Indexer) {
        this.__algoClient = client;
        this.__metadata = new Map();
        this.__algoIndexer = clientIndexer;
    }

    async addStandardAsset(
        assetId: number,
        tokenConfig: AlgorandStandardAssetConfig | AlgorandNativeTokenConfig
    ) {
        if ((tokenConfig as AlgorandStandardAssetConfig).assetId) {
            const assetInfo = (await this.__algoIndexer
                .lookupAssetByID(assetId)
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
