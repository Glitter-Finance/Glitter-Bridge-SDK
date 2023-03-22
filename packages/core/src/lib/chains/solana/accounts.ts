import * as solanaWeb3 from "@solana/web3.js";
import { Connection, Keypair, Signer } from "@solana/web3.js";
import { SolanaUtils } from "./utils";

export type SolanaAccount = {
    addr: string;
    sk: Uint8Array;
    pk: solanaWeb3.PublicKey;
    tokens?: SolanaTokenAccount[];
    Details?: SolanaAccountDetails;
    mnemonic?: string;
};
export type SolanaAccountDetails = {
    units?: number;
    balance?: number;
};
export type SolanaTokenAccount = {
    addr: string;
    pk: solanaWeb3.PublicKey;
    symbol: string;
};

export class SolanaAccounts {
    private _accounts: Record<string, SolanaAccount> = {};
    private _client?: Connection;

    //Setters
    public constructor(client: Connection) {
        this._client = client;
    }

    //Adders
    public async add(...args: [sk: Uint8Array | undefined] | [mnemonic: string | undefined]): Promise<SolanaAccount> {
        //Get Sk
        let sk: Uint8Array | undefined = undefined;
        if (typeof args[0] == "undefined") {
            throw new Error("solana add args not set");
        } else if (typeof args[0] == "string") {
            //Convert mnemonic to secret key
            const mnemonic = args[0] as string;
            sk = await SolanaUtils.mnemonicToSecretKey(mnemonic);
        } else if (typeof args[0] == "object") {
            //Convert Uint8Array to secret key
            sk = args[0] as Uint8Array;
        }

        //Check secret key
        if (!sk) throw new Error("Solana Key not found");

        //Get Wallet
        const solWallet = solanaWeb3.Keypair.fromSecretKey(sk);
        if (!solWallet) {
            throw new Error("Solana Wallet not found");
        }

        //Convert to account
        const solAccount: SolanaAccount = {
            addr: solWallet.publicKey.toString(),
            sk: sk,
            pk: solWallet.publicKey,
            Details: undefined,
        };
        //Add to accounts
        this._accounts[solAccount.addr] = solAccount;
        //Log
        console.log(`Added Solana Wallet:  ${solAccount.addr}`);
        //Return
        return solAccount;
    }

    //Updaters
    public async updateAccountDetails(local_acccount: SolanaAccount | undefined): Promise<SolanaAccount> {
        if (!local_acccount) throw new Error("Cannot update undefined account");
        if (!local_acccount.pk) throw new Error("Cannot update undefined account public key");
        if (!this._client) throw new Error("Cannot update account without client");

        const balance = await this._client.getBalance(local_acccount.pk);

        //Update account details
        if (!local_acccount.Details) local_acccount.Details = {} as SolanaAccountDetails;
        local_acccount.Details.balance = balance;

        //update account list
        this._accounts[local_acccount.addr] = local_acccount;

        //return
        return local_acccount;
    }

    //Creators
    public async createNew(): Promise<SolanaAccount> {
        //create mnemonic
        const mnemonic = SolanaUtils.generateMnemonic();

        //Create account
        const keyPair = await SolanaUtils.mnemonicToSecretKey(mnemonic);
        const wallet = Keypair.fromSecretKey(keyPair);

        //Convert to account
        const solAccount: SolanaAccount = {
            addr: wallet.publicKey.toString(),
            sk: wallet.secretKey,
            pk: wallet.publicKey,
            Details: undefined,
            mnemonic: mnemonic,
        };

        //Add to accounts
        this.add(solAccount.sk);

        return solAccount;
    }

    public async createNewWithPrefix(prefix: string, tries = 10000): Promise<SolanaAccount | undefined> {
        for (let i = 0; i < tries; i++) {
            //log intervalue of 10
            if (i % 100 === 0) console.log(`Trying ${i} of ${tries}`);

            //create mnemonic
            const mnemonic = SolanaUtils.generateMnemonic();
            const keyPair = await SolanaUtils.mnemonicToSecretKey(mnemonic);
            const wallet = Keypair.fromSecretKey(keyPair);

            const addr = wallet.publicKey.toString();
            if (addr.toLowerCase().startsWith(prefix.toLowerCase())) {
                // console.log(`Mnemonic: ${mnemonic}`);

                //Convert to account
                const solAccount: SolanaAccount = {
                    addr: wallet.publicKey.toString(),
                    sk: wallet.secretKey,
                    pk: wallet.publicKey,
                    Details: undefined,
                };

                //Add to accounts
                this.add(solAccount.sk);

                //Log
                // console.log(`Mnemonic: ${mnemonic}`);

                //Return
                return solAccount;
            }
        }

        console.log(`Could not find a wallet with prefix: ${prefix}`);
        return undefined;
    }

    // public static async closeTokenAccount(signer: SolanaAccount,
    //     receiver: SolanaAccount,
    //     token: BridgeToken): Promise<boolean> {
    //     // eslint-disable-next-line no-async-promise-executor
    //     return new Promise(async (resolve, reject) => {
    //         try {

    //             //Fail Safe
    //             if (!this._client) throw new Error("Solana Client not defined");
    //             if (!signer) throw new Error("Solana Account not defined");
    //             if (!receiver) throw new Error("Solana Account not defined");
    //             if (!token) throw new Error("Token not defined");

    //             let result = await SolanaTransactions.closeOutTokenAccount(signer, receiver,token);
    //             resolve(result);
    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // }

    //Functions

    // public static async fundAccountToken(funder: SolanaAccount, account: SolanaAccount, amount: number, symbol: string): Promise<boolean> {
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             // if (!this._client) throw new Error("Solana Client not defined");

    //             // //Get Token
    //             // const asset = BridgeTokens.get("algorand", symbol);
    //             // if (!asset) throw new Error("Asset not found");

    //             // //Get routing
    //             // const routing = RoutingDefault();
    //             // routing.from.address = funder.addr;
    //             // routing.from.token = symbol;
    //             // routing.from.network = "algorand";

    //             // routing.to.address = account.addr;
    //             // routing.to.token = symbol;
    //             // routing.to.network = "algorand";

    //             // routing.amount = amount;

    //             // let returnValue = await AlgorandTransactions.sendTokens(routing, funder, asset);
    //             resolve(returnValue);
    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // }
    public async optinAsset(account: SolanaAccount, symbol: string): Promise<boolean> {
        console.log("Optin Asset");
        console.log("not implemented");
        console.log(account);
        console.log(symbol);
        // if (!this._client) throw new Error("Solana Client not defined");

        // //Get Token
        // const asset = BridgeTokens.get("algorand", symbol);
        // if (!asset) throw new Error("Asset not found");

        // //Run Transaction
        // let returnValue = await AlgorandTransactions.optinToken(account, asset);

        return true;
    }
    public async closeOutAsset(account: SolanaAccount, symbol: string, close_to: string): Promise<boolean> {
        console.log("Optin Asset");
        console.log("not implemented");
        console.log(account);
        console.log(symbol);
        console.log(close_to);

        // if (!this._client) throw new Error("Solana Client not defined");

        // //Get Token
        // const asset = BridgeTokens.get("algorand", symbol);
        // if (!asset) throw new Error("Asset not found");

        // //Run Transaction
        // let returnValue = await AlgorandTransactions.closeOutTokenAccount(account, close_to, asset);

        return true;
    }

    //Getters
    public getAccount(addr: string): SolanaAccount | undefined {
        return this._accounts[addr];
    }
    public getTokenAccount(addr: string, token: string): SolanaTokenAccount | undefined {
        const account = this._accounts[addr];
        if (!account) return undefined;
        if (!account.tokens) return undefined;

        account.tokens.forEach((accountToken) => {
            if (accountToken.symbol === token) return accountToken;
        });

        return undefined;
    }
    public static getSignerObject(account: SolanaAccount): Signer {
        return {
            publicKey: account.pk,
            secretKey: account.sk,
        } as Signer;
    }
}
