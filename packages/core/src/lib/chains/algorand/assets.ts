import { ValueUnits } from "../../common";
import { Algodv2 } from "algosdk";

export type AlgorandAsset = {
    index: number;
    created_round: number;
    deleted: boolean;
    clawback: string;
    creator: string;
    decimals: number;
    default_frozen: boolean;
    freeze: string;
    manager: string;
    metadata_hash: string;
    name: string;
    reserve: string;
    total: number;
    total_in_decimal: number;
    unit_name: string;
    url: string;
};

export class AlgorandAssets {
    private _assets: Record<string, AlgorandAsset> = {};
    private _client: Algodv2 | undefined = undefined;

    //constructor
    public constructor(algoClient: Algodv2) {
        this._client = algoClient;
    }

    public async add(asset_id: number | undefined): Promise<AlgorandAsset | undefined> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!asset_id) throw new Error("asset_id not defined");
                if (!this._client) throw new Error("Algorand Client not defined");

                //Check if already exists
                if (this._assets[asset_id.toString()]) {
                    resolve(this._assets[asset_id.toString()]);
                    return;
                }

                //Get Asset Info
                let asset: AlgorandAsset | undefined = undefined;

                //Get Balance
                const assetInfo = await this._client.getAssetByID(asset_id).do();
                asset = this.updateInfo(asset, assetInfo);

                //console.log(util.inspect(assetInfo, false, 5, true /* enable colors */));
                resolve(asset);
            } catch (error) {
                reject(error);
            }
        });
    }

    private updateInfo(asset: AlgorandAsset | undefined, assetInfo: Record<string, any>): AlgorandAsset {
        if (!asset) asset = {} as AlgorandAsset;
        asset.index = assetInfo.index;
        asset.created_round = assetInfo.created_round;
        asset.deleted = assetInfo.deleted;
        asset.clawback = assetInfo.params.clawback;
        asset.creator = assetInfo.params.creator;
        asset.decimals = assetInfo.params.decimals;
        asset.default_frozen = assetInfo.params.default_frozen;
        asset.freeze = assetInfo.params.freeze;
        asset.manager = assetInfo.params.manager;
        asset.metadata_hash = assetInfo.params.metadata_hash;
        asset.name = assetInfo.params.name;
        asset.reserve = assetInfo.params.reserve;
        asset.total = assetInfo.params.total;
        asset.total_in_decimal = ValueUnits.fromUnits(assetInfo.params.total, assetInfo.params.decimals).value;
        asset.unit_name = assetInfo.params.unit_name;
        asset.url = assetInfo.params.url;
        return asset;
    }
}
