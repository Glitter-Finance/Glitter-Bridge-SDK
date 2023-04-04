import algosdk, {
    MultisigMetadata,
    Algodv2,
    Transaction,
    Account,
} from "algosdk";
import SendRawTransaction from "algosdk/dist/types/client/v2/algod/sendRawTransaction";
import {AlgorandStandardAssetConfig} from "src/lib/common";
import {AlgorandAccount, AlgorandAccountInformation, AlgorandMultiSigAccount} from "./types";
import BigNumber from "bignumber.js";

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
        threshold: number,
        version = 1,
    ): Promise<AlgorandMultiSigAccount> {
        const params = {
            version: version,
            threshold: threshold,
            addrs: addreses,
        } as MultisigMetadata;

        // https://github.com/Glitter-Finance/SDK/pull/33
        // TODO: aurel suggested to add another value
        // to make it unique
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
        const algorandAcocunt: AlgorandAccount = {
            addr: account.addr,
            sk: account.sk,
            pk: algosdk.decodeAddress(account.addr).publicKey
        };
        this.__accounts.set(account.addr, algorandAcocunt);
        return algorandAcocunt;
    }

    public async createNewWithPrefix(
        prefix: string,
        tries = 10000
    ): Promise<AlgorandAccount> {
        for (let i = 0; i < Math.min(tries, 10**5); i++) {
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

    public async getAlgoBalance(address: string): Promise<{
        balanceHuman: BigNumber;
        balanceBn: BigNumber;
    }> {
        const accountInfo = await this.getAccountInfo(address);
        const amount = BigInt(accountInfo.amount) / BigInt(10 ** this.ALGO_DECIMALS);
        return {
            balanceHuman: BigNumber(amount.toString()),
            balanceBn: BigNumber(accountInfo.amount)
        }
    }

    public async getStandardAssetBalance(
        address: string,
        token: AlgorandStandardAssetConfig
    ): Promise<{
        balanceHuman: BigNumber;
        balanceBn: BigNumber;
    }> {
        const accountInfo = this.__accounts.get(address);

        if (accountInfo && accountInfo.information) {
            const asset = accountInfo.information.assets.find(
                (x) => x["asset-id"] === token.assetId
            );
            if (asset) {
                const amount = BigInt(asset.amount) / BigInt(10 ** token.decimals);
                return {
                    balanceBn: new BigNumber(asset.amount),
                    balanceHuman: new BigNumber(amount.toString())
                }
            }
        }

        throw new Error('Unable to fetch account info')
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
    ): Promise<string[]> {
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

        await this.__client
            .sendRawTransaction(signedTxns)
            .do();

        await algosdk.waitForConfirmation(
            this.__client,
            transactions[0].txID().toString(),
            20
        );

        return transactions.map(x => x.txID());
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
