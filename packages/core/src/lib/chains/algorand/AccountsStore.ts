import algosdk, {
    MultisigMetadata,
    Algodv2,
    Transaction,
    Account,
} from "algosdk";
import SendRawTransaction from "algosdk/dist/types/client/v2/algod/sendRawTransaction";
import {AlgorandStandardAssetConfig} from "src/lib/common";

export type AlgorandAccount = {
  addr: string;
  sk: Uint8Array;
  pk: Uint8Array;
  information: AlgorandAccountInformation;
};

export type AlgorandMultiSigAccount = {
  addr: string;
  pk: Uint8Array;
  addresses: string[];
  params: MultisigMetadata;
  information: AlgorandAccountInformation;
};

export type AlgorandAccountInformation = {
  address: string;
  amount: number;
  "amount-without-pending-rewards": number;
  "apps-local-state": Array<any>;
  "apps-total-schema": { "num-byte-slice": number; "num-uint": number };
  "created-apps": Array<any>;
  "created-assets": Array<any>;
  "min-balance": number;
  "pending-rewards": number;
  "reward-base": number;
  rewards: number;
  round: number;
  status: string;
  "total-apps-opted-in": number;
  "total-assets-opted-in": number;
  "total-created-apps": number;
  "total-created-assets": number;
  assets: Array<{
    amount: number;
    "asset-id": number;
    "is-frozen": boolean;
  }>;
};

export class AlgorandAccountsStore {
    private ALGO_DECIMALS = 6;
    private __accounts: Map<string, AlgorandAccount>;
    private __multisigs: Map<string, AlgorandMultiSigAccount>;
    private __client: Algodv2;

    public constructor(algoClient: Algodv2) {
        this.__client = algoClient;
        this.__accounts = new Map();
        this.__multisigs = new Map();
    }

    public async add(
        ...args: [sk: Uint8Array | undefined] | [mnemonic: string | undefined]
    ): Promise<AlgorandAccount> {
        let mnemonic: string | null = null;

        if (typeof args[0] === "string") {
            mnemonic = args[0] as string;
        } else if (typeof args[0] == "object") {
            const sk = args[0] as Uint8Array;
            mnemonic = algosdk.secretKeyToMnemonic(sk);
        }

        if (!mnemonic)
            return Promise.reject("Unable to add account using provided phrase/key");
        const account = algosdk.mnemonicToSecretKey(mnemonic);

        const publicKey = account.addr.toString();
        if (this.__accounts.has(publicKey)) {
            const algoAccount = this.__accounts.get(publicKey);
            if (!algoAccount)
                return Promise.reject("Unable to find account " + publicKey);
            return algoAccount;
        }

        const accountInfo: AlgorandAccountInformation = await this.getAccountInfo(
            publicKey
        );
        const accountMetdata: AlgorandAccount = {
            information: accountInfo,
            sk: account.sk,
            pk: algosdk.decodeAddress(account.addr).publicKey,
            addr: account.addr,
        };
        this.__accounts.set(publicKey, accountMetdata);
        return accountMetdata;
    }

    public async addMultiSignatureAccount(
        addreses: string[],
        version = 1,
        threshold = 2
    ): Promise<AlgorandMultiSigAccount> {
        const params = {
            version: version,
            threshold: threshold,
            addrs: addreses,
        } as MultisigMetadata;

        const mSigIdentifier = addreses.join("");
        const exists = this.__multisigs.get(mSigIdentifier);

        if (exists) {
            return exists;
        }

        const addr = algosdk.multisigAddress(params);
        const accountInfo = await this.getAccountInfo(addr);

        const msig: AlgorandMultiSigAccount = {
            addr: addr,
            addresses: addreses,
            params: params,
            information: accountInfo,
            pk: algosdk.decodeAddress(addr).publicKey,
        };

        this.__multisigs.set(mSigIdentifier, msig);
        return msig;
    }

    public async getAccountInfo(
    account: AlgorandAccount
  ): Promise<AlgorandAccountInformation>;
    public async getAccountInfo(
    address: string
  ): Promise<AlgorandAccountInformation>;
    public async getAccountInfo(
        params: string | AlgorandAccount
    ): Promise<AlgorandAccountInformation> {
        let account;
        if (typeof params == "string") {
            account = params;
        } else {
            account = params.addr.toString();
        }

        const accountInfo = await this.__client.accountInformation(account).do();
        return accountInfo as AlgorandAccountInformation;
    }

    public async updateAccountDetails(
        account: AlgorandAccount
    ): Promise<AlgorandAccount> {
        const updatedInfo = await this.getAccountInfo(account.addr);
        account.information = updatedInfo;
        this.__accounts.set(account.addr, account);
        return account;
    }

    public async createNew(): Promise<AlgorandAccount> {
        const account = algosdk.generateAccount();
        const accountInfo = await this.getAccountInfo(account.addr.toString());
        const algorandAcocunt: AlgorandAccount = {
            addr: account.addr,
            sk: account.sk,
            pk: algosdk.decodeAddress(account.addr).publicKey,
            information: accountInfo,
        };
        this.__accounts.set(account.addr, algorandAcocunt);
        return algorandAcocunt;
    }

    public async createNewWithPrefix(
        prefix: string,
        tries = 10000
    ): Promise<AlgorandAccount> {
        for (let i = 0; i < tries; i++) {
            if (i % 100 === 0) console.log(`Trying ${i} of ${tries}`);

            const account = algosdk.generateAccount();
            const generatedAddr = account.addr.toLowerCase();
            const isPrefixed = generatedAddr.startsWith(prefix.toLowerCase());

            if (isPrefixed) {
                const acc = this.add(account.sk);
                return acc;
            }
        }

        return Promise.reject("Account generation with retries exhausted");
    }

    public async getAlgoBalance(address: string): Promise<number> {
        const accountInfo = await this.getAccountInfo(address);
        const amount =
      BigInt(accountInfo.amount) / BigInt(10 ** this.ALGO_DECIMALS);
        return Number(amount.toString());
    }

    public async getStandardAssetBalance(
        address: string,
        token: AlgorandStandardAssetConfig
    ): Promise<number> {
        const accountInfo = this.__accounts.get(address);

        if (accountInfo) {
            const asset = accountInfo.information.assets.find(
                (x) => x["asset-id"] === token.assetId
            );
            if (asset) {
                const amount = BigInt(asset.amount) / BigInt(10 ** token.decimals);
                return Number(amount.toString());
            }
        }

        return 0;
    }
    /**
   *
   * @param transactions
   * @param signer
   * @returns
   */
    async signAndSendTransactions(
        transactions: Transaction[],
        signer: Account
    ): Promise<SendRawTransaction> {
        if (transactions.length == 0)
            throw new Error(
                "Transactions array should contain one or more transactions."
            );
        if (transactions.length > 4)
            throw new Error("Maximum of 4 transactions can be sent at a time.");

        const signedTxns: Uint8Array[] = [];
        const groupID = algosdk.computeGroupID(transactions);

        for (let i = 0; i < transactions.length; i++) {
            transactions[i].group = groupID;
            const signedTxn: Uint8Array = transactions[i].signTxn(signer.sk);
            signedTxns.push(signedTxn);
        }

        const txnResult: SendRawTransaction = await this.__client
            .sendRawTransaction(signedTxns)
            .do();
        await algosdk.waitForConfirmation(
            this.__client,
            transactions[0].txID().toString(),
            4
        );
        return txnResult;
    }
    /**
   *
   * Signs and send multi sig
   * @param groupedTxns
   * @param signers
   * @param mParams
   * @returns
   */
    async signAndSendMultisigTransactions(
        groupedTxns: Transaction[],
        mParams: algosdk.MultisigMetadata,
        signers: Account[]
    ): Promise<SendRawTransaction> {
        if (groupedTxns.length == 0) throw new Error("No Transactions to sign");
        if (groupedTxns.length > 4)
            throw new Error("Maximum 4 Transactions in a group");

        const signedTxns: Uint8Array[] = [];
        const groupID = algosdk.computeGroupID(groupedTxns);

        for (let i = 0; i < groupedTxns.length; i++) {
            groupedTxns[i].group = groupID;

            let signedTxn: Uint8Array = algosdk.signMultisigTransaction(
                groupedTxns[i],
                mParams,
                signers[0].sk
            ).blob;
            for (let j = 1; j < signers.length; j++) {
                signedTxn = algosdk.appendSignMultisigTransaction(
                    signedTxn,
                    mParams,
                    signers[j].sk
                ).blob;
            }
            signedTxns.push(signedTxn);
        }

        const txnResult = await this.__client.sendRawTransaction(signedTxns).do();
        await algosdk.waitForConfirmation(
            this.__client,
            groupedTxns[0].txID().toString(),
            4
        );
        return txnResult;
    }
}
