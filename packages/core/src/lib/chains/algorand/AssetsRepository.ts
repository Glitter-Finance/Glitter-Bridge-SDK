import {Algodv2} from "algosdk";
import {AlgorandAssetConfig} from "./types";

export type AlgorandAssetMetadata = {
  index: number;
  params: {
    creator: string;
    decimals: number;
    "default-frozen": boolean;
    freeze: string;
    manager: string;
    name: string;
    "name-b64": string;
    reserve: string;
    total: number;
    "unit-name": string;
    "unit-name-b64": string;
    url: string;
    "url-b64": string;
  };
};

export class AssetsRepository {
    protected __metadata: Map<
    string,
    AlgorandAssetMetadata & AlgorandAssetConfig
  >;
    protected __algoClient: Algodv2;

    constructor(client: Algodv2) {
        this.__algoClient = client;
        this.__metadata = new Map();
    }

    async addStandardAsset(assetId: number, tokenConfig: AlgorandAssetConfig) {
        const assetInfo = (await this.__algoClient
            .getAssetByID(assetId)
            .do()) as AlgorandAssetMetadata;

        this.__metadata.set(assetInfo.params["unit-name"], {
            ...assetInfo,
            ...tokenConfig,
        });
    }

    get(
        tokenSymbol: string
    ): (AlgorandAssetMetadata & AlgorandAssetConfig) | undefined {
        return this.__metadata.get(tokenSymbol);
    }
}
