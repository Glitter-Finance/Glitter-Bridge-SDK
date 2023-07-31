import algosdk, {
    MultisigMetadata,
    Algodv2,
    Transaction,
    Account,
} from "algosdk";
import SendRawTransaction from "algosdk/dist/types/client/v2/algod/sendRawTransaction";
import { AlgorandStandardAssetConfig } from "../../common";
import { AlgorandAccount, AlgorandAccountInformation, AlgorandMultiSigAccount } from "./types";
import BigNumber from "bignumber.js";

/**
 * Class representing an Algorand accounts store.
 */
export class AlgorandAccountsStore {
    private ALGO_DECIMALS = 6;
    private __accounts: Map<string, AlgorandAccount>;
    private __multisigs: Map<string, AlgorandMultiSigAccount>;
    private __client: Algodv2;

    /**
     * Create an instance of AlgorandAccountsStore.
     * @param {Algodv2} algoClient - The Algorand client instance.
     */
    public constructor(algoClient: Algodv2) {
        this.__client = algoClient;
        this.__accounts = new Map();
        this.__multisigs = new Map();
    }

    /**
     * Adds a new Algorand account to the store.
     *
     * @param {Uint8Array|string} args - Either the secret key (as a Uint8Array) or the mnemonic (as a string) for the account.
     * @returns {Promise<AlgorandAccount>} - A promise that resolves with the added Algorand account.
     */
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

    /**
     * gets the mnemonic for an Algorand account.
     * @param {AlgorandAccount} account - The Algorand account.
     * @returns {Promise<string>} - A promise that resolves with the mnemonic for the account.    
     */
    public async getMnemonic(account: AlgorandAccount): Promise<string> {
        if (!account) return Promise.reject("Unable to find account");
        return algosdk.secretKeyToMnemonic(account.sk);
    }

    /**
     * Adds a new multi-signature Algorand account to the store.
     *
     * @param {string[]} addresses - The addresses of the participants in the multi-signature account.
     * @param {number} threshold - The minimum number of signatures required to authorize a transaction.
     * @param {number} [version=1] - The version of the multi-signature account.
     * @returns {Promise<AlgorandMultiSigAccount>} - A promise that resolves with the added multi-signature account.
     */
    public async addMultiSignatureAccount(
        addresses: string[],
        threshold: number,
        version = 1,
    ): Promise<AlgorandMultiSigAccount> {
        const params = {
            version: version,
            threshold: threshold,
            addrs: addresses,
        } as MultisigMetadata;

        // https://github.com/Glitter-Finance/SDK/pull/33
        // TODO: aurel suggested to add another value
        // to make it unique
        const mSigIdentifier = addresses.join("");
        const exists = this.__multisigs.get(mSigIdentifier);

        if (exists) {
            return exists;
        }

        const addr = algosdk.multisigAddress(params);
        const accountInfo = await this.getAccountInfo(addr);

        const msig: AlgorandMultiSigAccount = {
            addr: addr,
            addresses: addresses,
            params: params,
            information: accountInfo,
            pk: algosdk.decodeAddress(addr).publicKey,
        };

        this.__multisigs.set(mSigIdentifier, msig);
        return msig;
    }

    /**
     * Retrieves the account information for a specified account.
     *
     * @param {string|AlgorandAccount} params - Either the account address (as a string) or the AlgorandAccount object.
     * @returns {Promise<AlgorandAccountInformation>} - A promise that resolves with the account information.
     */
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

    /**
     * Updates the account details for a specified Algorand account.
     *
     * @param {AlgorandAccount} account - The Algorand account to update.
     * @returns {Promise<AlgorandAccount>} - A promise that resolves with the updated Algorand account.
     */
    public async updateAccountDetails(
        account: AlgorandAccount
    ): Promise<AlgorandAccount> {
        const updatedInfo = await this.getAccountInfo(account.addr);
        account.information = updatedInfo;
        this.__accounts.set(account.addr, account);
        return account;
    }

    /**
     * Creates a new Algorand account.
     *
     * @returns {Promise<AlgorandAccount>} - A promise that resolves with the newly created Algorand account.
     */
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

    /**
     * Creates a new Algorand account with a specified prefix for the address.
     *
     * @param {string} prefix - The prefix for the address.
     * @param {number} [tries=10000] - The maximum number of attempts to find an available address.
     * @returns {Promise<AlgorandAccount>} - A promise that resolves with the newly created Algorand account.
     */
    public async createNewWithPrefix(
        prefix: string,
        tries = 10000
    ): Promise<AlgorandAccount> {
        for (let i = 0; i < Math.min(tries, 10 ** 5); i++) {
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

    /**
     * Retrieves the Algo balance of a specified address.
     *
     * @param {string} address - The address for which to retrieve the Algo balance.
     * @returns {Promise<{ balanceHuman: BigNumber, balanceBn: BigNumber }>} - A promise that resolves with the Algo balance in both human-readable and BigNumber format.
     */
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

    /**
     * Retrieves the balance of a specific standard asset for a specified address.
     *
     * @param {string} address - The address for which to retrieve the asset balance.
     * @param {AlgorandStandardAssetConfig} token - The token configuration object for the standard asset.
     * @returns {Promise<{ balanceHuman: BigNumber, balanceBn: BigNumber }>} - A promise that resolves with the asset balance in both human-readable and BigNumber format.
     */
    public async getStandardAssetBalance(
        address: string,
        token: AlgorandStandardAssetConfig
    ): Promise<{
        balanceHuman: BigNumber;
        balanceBn: BigNumber;
    }> {
        const accountInfo = await this.getAccountInfo(address);

        if (accountInfo) {
            const asset = accountInfo.assets.find(
                (x) => x["asset-id"] === token.assetId
            );
            if (asset) {
                const amount = new BigNumber(asset.amount).div(new BigNumber(10 ** token.decimals));
                return {
                    balanceBn: new BigNumber(asset.amount),
                    balanceHuman: new BigNumber(amount.toString())
                }
            }
        }

        return {
            balanceBn: new BigNumber(0),
            balanceHuman: new BigNumber(0),
        }
    }

    /**
     * Signs and sends an array of transactions using the specified signer address.
     *
     * @param {Transaction[]} transactions - The transactions to sign and send.
     * @param {string} signerAddress - The address of the signer.
     * @returns {Promise<string[]>} - A promise that resolves with an array of transaction IDs.
     */
    async signAndSendTransactions(
        transactions: Transaction[],
        signerAddress: string
    ): Promise<string[]> {
        if (transactions.length == 0)
            throw new Error(
                "Transactions array should contain one or more transactions."
            );

        const signer = this.__accounts.get(signerAddress)
        if (!signer) throw new Error('Signer Account unavailable')
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
     * Signs and sends an array of multisig transactions using the specified signers and multisig metadata.
     *
     * @param {Transaction[]} groupedTxns - The grouped transactions to sign and send.
     * @param {algosdk.MultisigMetadata} mParams - The multisig metadata object.
     * @param {Account[]} signers - The signers for the multisig account.
     * @returns {Promise<SendRawTransaction>} - A promise that resolves with the result of sending the multisig transactions.
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
