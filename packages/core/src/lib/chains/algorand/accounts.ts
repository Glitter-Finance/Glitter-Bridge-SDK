import algosdk, { MultisigMetadata, Algodv2 } from "algosdk";
import * as util from "util";
import { BridgeToken, ValueUnits } from "../../common";
import { AlgoError } from "./algoError";

export type AlgorandAccount = {
    addr: string;
    sk: Uint8Array;
    pk: Uint8Array;
    Details: AlgorandAccountDetails | undefined;
};
export type AlgorandMSigAccount = {
    addr: string;
    pk: Uint8Array;
    addresses: string[];
    params: MultisigMetadata;
    Details: AlgorandAccountDetails | undefined;
};
export type AlgorandAccountDetails = {
    units: number | undefined;
    balance: number | undefined;
    min_balance: number | undefined;
    pending_rewards: number | undefined;
    total_apps_created: number | undefined;
    total_apps_opted_in: number | undefined;
    total_assets_opted_in: number | undefined;
    total_assets_created: number | undefined;
    assets: AlgorandAccountAsset[];
};
export type AlgorandAccountAsset = {
    asset_id: number;
    units: bigint;
    frozen: boolean;
    name: string | undefined;
    balance: number | undefined;
    decimals: number | undefined;
};

export class AlgorandAccounts {
    public algo_decimals = 6;

    private _accounts: Record<string, AlgorandAccount> = {};
    private _msigs: Record<string, AlgorandMSigAccount> = {};
    private _client: Algodv2 | undefined = undefined;

    //constructor
    public constructor(algoClient: Algodv2) {
        this._client = algoClient;
    }

    //Adders
    public async add(
        ...args: [sk: Uint8Array | undefined] | [mnemonic: string | undefined]
    ): Promise<AlgorandAccount | undefined> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Get Sk
                let mnemonic: string | undefined = undefined;
                if (typeof args[0] == "undefined") {
                    throw new Error("DEV_SOLANA_ACCOUNT_TEST not set");
                } else if (typeof args[0] == "string") {
                    //Convert mnemonic to secret key
                    mnemonic = args[0] as string;
                } else if (typeof args[0] == "object") {
                    //Convert Uint8Array to secret key
                    const sk = args[0] as Uint8Array;
                    mnemonic = algosdk.secretKeyToMnemonic(sk);
                }

                //Fail Safe
                if (!mnemonic) throw new Error(AlgoError.INVALID_MNEMONIC);

                //Convert seed to Account
                const local_acccount = algosdk.mnemonicToSecretKey(mnemonic) as AlgorandAccount;
                if (!local_acccount) throw new Error(AlgoError.INVALID_MNEMONIC);

                //Log
                // console.log(`Added Algorand Wallet:  ${local_acccount.addr}`)

                //Check if already exists
                if (this._accounts[local_acccount.addr]) {
                    console.log(`Algorand Wallet already exists:  ${local_acccount.addr}`);
                    resolve(this._accounts[local_acccount.addr]);
                    return;
                }

                //Get pk
                local_acccount.pk = algosdk.decodeAddress(local_acccount.addr).publicKey;

                //Add to accounts
                this._accounts[local_acccount.addr] = local_acccount;

                console.log(util.inspect(local_acccount, false, 5, true /* enable colors */));

                //return
                resolve(local_acccount);
            } catch (error) {
                reject(error);
            }
        });
    }

    public async addMSIG(
        addreses: string[],
        version = 1,
        threshold = 2,
        getAccountDetails = false
    ): Promise<AlgorandMSigAccount | undefined> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                const params = {
                    version: version,
                    threshold: threshold,
                    addrs: addreses,
                } as MultisigMetadata;

                //Check if already exists
                if (this._msigs[addreses.join(",")]) {
                    resolve(this._msigs[addreses.join(",")]);
                    return;
                }

                //Get msig
                const addr = algosdk.multisigAddress(params);
                const msig: AlgorandMSigAccount = {
                    addr: addr,
                    addresses: addreses,
                    params: params,
                    Details: undefined,
                    pk: algosdk.decodeAddress(addr).publicKey,
                };

                //Get Account Details
                if (getAccountDetails) {
                    const accountInfo = await this.getInfo(msig.addr);
                    if (!accountInfo) throw new Error(AlgoError.ACCOUNT_INFO);
                    msig.Details = await this.updateInfo(msig.Details, accountInfo);
                }

                this._msigs[addreses.join(",")] = msig;

                //return
                resolve(msig);
            } catch (error) {
                reject(error);
            }
        });
    }

    //Getters
    public get(addr: string): AlgorandAccount | undefined {
        return this._accounts[addr];
    }
    public getMSIG(addreses: string[]): AlgorandMSigAccount | undefined {
        return this._msigs[addreses.join(",")];
    }
    public async getInfo(account: AlgorandAccount): Promise<Record<string, any> | undefined>;
    public async getInfo(address: string): Promise<Record<string, any> | undefined>;
    public async getInfo(params: string | AlgorandAccount): Promise<Record<string, any> | undefined> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);

                let account: AlgorandAccount | undefined = undefined;
                if (typeof params == "string") {
                    account = this.get(params);
                    if (!account) throw new Error(AlgoError.INVALID_ACCOUNT);
                } else {
                    account = params;
                }

                //Get Balance
                const accountInfo = await this._client.accountInformation(account.addr).do();
                resolve(accountInfo);
            } catch (error) {
                reject(error);
            }
        });
    }
    public getMnemonic(account: AlgorandAccount): string | undefined {
        if (!account.sk) return undefined;
        return algosdk.secretKeyToMnemonic(account.sk);
    }

    //Updaters
    private async updateInfo(
        account: AlgorandAccountDetails | undefined,
        accountInfo: Record<string, any>
    ): Promise<AlgorandAccountDetails> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                if (!account) account = {} as AlgorandAccountDetails;
                account.units = accountInfo.amount;
                account.balance = ValueUnits.fromUnits(BigInt(accountInfo.amount), this.algo_decimals).value;
                account.min_balance = ValueUnits.fromUnits(
                    BigInt(accountInfo["min-balance"]),
                    this.algo_decimals
                ).value;
                account.pending_rewards = accountInfo["pending-rewards"];
                account.total_apps_created = accountInfo["total-created-apps"];
                account.total_apps_opted_in = accountInfo["total-apps-opted-in"];
                account.total_assets_opted_in = accountInfo["total-assets-opted-in"];
                account.total_assets_created = accountInfo["total-created-assets"];

                for (let i = 0; i < accountInfo.assets.length; i++) {
                    const asset = accountInfo.assets[i];
                    account.assets = account.assets || [];

                    const new_asset: AlgorandAccountAsset = {
                        asset_id: asset["asset-id"],
                        units: asset.amount,
                        frozen: asset["is-frozen"],
                        name: undefined,
                        balance: undefined,
                        decimals: undefined,
                    };

                    // if (getAssetDetails) {
                    //     const asset_details = await AlgorandAssets.add(new_asset.asset_id);
                    //     if (asset_details) {
                    //         new_asset.balance = ValueUnits.fromUnits(new_asset.units, asset_details.decimals).value
                    //         new_asset.name = asset_details.name;
                    //         new_asset.decimals = asset_details.decimals;
                    //     }
                    // }

                    account.assets.push(new_asset);
                }

                //return
                resolve(account);
            } catch (error) {
                reject(error);
            }
        });
    }
    public async updateAccountDetails(local_acccount: AlgorandAccount | undefined): Promise<AlgorandAccount> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                if (!local_acccount) throw new Error(AlgoError.INVALID_ACCOUNT);
                const accountInfo = await this.getInfo(local_acccount);
                if (!accountInfo) throw new Error(AlgoError.ACCOUNT_INFO);
                local_acccount.Details = await this.updateInfo(local_acccount.Details, accountInfo);

                //update account list
                this._accounts[local_acccount.addr] = local_acccount;

                //return
                resolve(local_acccount);
            } catch (error) {
                reject(error);
            }
        });
    }

    //Creators
    public async createNew(): Promise<AlgorandAccount> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                const account = algosdk.generateAccount();
                const new_account: AlgorandAccount = {
                    addr: account.addr,
                    sk: account.sk,
                    pk: algosdk.decodeAddress(account.addr).publicKey,
                    Details: undefined,
                };
                resolve(new_account);
            } catch (error) {
                reject(error);
            }
        });
    }
    public async createNewWithPrefix(prefix: string, tries = 10000): Promise<AlgorandAccount | undefined> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                for (let i = 0; i < tries; i++) {
                    //log intervalue of 10
                    if (i % 100 === 0) console.log(`Trying ${i} of ${tries}`);

                    //create mnemonic
                    const account = algosdk.generateAccount();
                    const addr = account.addr;
                    if (addr.toLowerCase().startsWith(prefix.toLowerCase())) {
                        //Convert to account
                        const new_account: AlgorandAccount = {
                            addr: account.addr,
                            sk: account.sk,
                            pk: algosdk.decodeAddress(account.addr).publicKey,
                            Details: undefined,
                        };

                        //Add to accounts
                        this.add(new_account.sk);

                        //Return
                        resolve(new_account);
                        return;
                    }
                }

                console.log(`Could not find a wallet with prefix: ${prefix}`);
                resolve(undefined);
            } catch (error) {
                reject(error);
            }
        });
    }

    //Account Query
    public async getBalance(address: string): Promise<number> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
                if (!address) throw new Error(AlgoError.INVALID_ACCOUNT);

                const accountInfo = await this._client.accountInformation(address).do();
                if (!accountInfo) throw new Error(AlgoError.ACCOUNT_INFO);

                return resolve(ValueUnits.fromUnits(BigInt(accountInfo.amount), this.algo_decimals).value);
            } catch (error) {
                reject(error);
            }
        });
    }
    public async getTokensHeld(address: string, token: BridgeToken): Promise<number> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error(AlgoError.CLIENT_NOT_SET);
                if (!token) throw new Error(AlgoError.INVALID_ASSET);
                if (!address) throw new Error(AlgoError.INVALID_ASSET);

                const accountInfo = await this._client.accountInformation(address).do();
                if (!accountInfo) throw new Error(AlgoError.ACCOUNT_INFO);

                let tokensHeld = 0;
                for (let i = 0; i < accountInfo.assets.length; i++) {
                    if (accountInfo.assets[i]["asset-id"] == token.address) {
                        tokensHeld = accountInfo.assets[i].amount;
                    }
                }
                return resolve(ValueUnits.fromUnits(BigInt(tokensHeld), token.decimals).value);
            } catch (error) {
                reject(error);
            }
        });
    }
}
