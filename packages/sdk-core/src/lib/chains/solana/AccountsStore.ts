import * as solanaWeb3 from "@solana/web3.js";
import { Connection, Keypair } from "@solana/web3.js";
import { BridgeTokenConfig } from "../../common";
import { PublicKey } from "@solana/web3.js";
import { solanaMnemonicToSecretkey } from "./utils";
import * as bip39 from "bip39"
import BigNumber from "bignumber.js";
import { getAssociatedTokenAccount } from "./transactions";

/**
 * Represents a Solana account.
 *
 * @typedef {Object} SolanaAccount
 * @property {string} addr - The account address.
 * @property {Uint8Array} sk - The secret key.
 * @property {PublicKey} pk - The public key.
 * @property {number} [balance] - The account balance (optional).
 * @property {string} [mnemonic] - The mnemonic associated with the account (optional).
 */
export type SolanaAccount = {
    addr: string;
    sk: Uint8Array;
    pk: PublicKey;
    balance?: number;
    mnemonic?: string;
};

/**
 * Represents a store for Solana accounts.
 *
 * @class SolanaAccountsStore
 */
export class SolanaAccountsStore {
    SOL_DECIMALS = 9
    private __accounts: Map<string, SolanaAccount>;
    private __connection: Connection;

    /**
     * Represents a store for Solana accounts.
     *
     * @class SolanaAccountsStore
     * @constructor
     * @param {Connection} connection - The Solana connection object to use for interacting with the Solana network.
     */
    public constructor(connection: Connection) {
        this.__connection = connection;
        this.__accounts = new Map();
    }

    /**
     * Adds a new Solana account to the store.
     *
     * @method add
     * @async
     * @param {Uint8Array|undefined|string|undefined} skOrMnemonic - The secret key as Uint8Array or the mnemonic as a string (optional).
     * @returns {Promise<SolanaAccount>} - A Promise that resolves to the added Solana account.
     */
    public async add(...args: [sk: Uint8Array | undefined] | [mnemonic: string | undefined]): Promise<SolanaAccount> {
        let sk: Uint8Array | undefined = undefined;
        if (typeof args[0] == "undefined") {
            return Promise.reject(new Error("solana add args not set"));
        } else if (typeof args[0] == "string") {
            const mnemonic = args[0] as string;
            sk = await solanaMnemonicToSecretkey(mnemonic);
        } else if (typeof args[0] == "object") {
            sk = args[0] as Uint8Array;
        }

        if (!sk) return Promise.reject(new Error("Solana Key not found"));
        const keyPair = solanaWeb3.Keypair.fromSecretKey(sk);

        const solAccount: SolanaAccount = {
            addr: keyPair.publicKey.toString(),
            sk: sk,
            pk: keyPair.publicKey
        };

        this.__accounts.set(keyPair.publicKey.toString(), solAccount)
        return solAccount;
    }

    /**
     * Retrieves the SOL (Solana) token balance for a given account address.
     *
     * @method getSOLBalance
     * @async
     * @param {string} accountAddress - The account address for which to retrieve the SOL balance.
     * @param {Connection} [connection] - The Solana connection object to use for retrieving the balance (optional, defaults to the class's connection).
     * @returns {Promise<{ balanceBn: BigNumber, balanceHuman: BigNumber }>} - A Promise that resolves to an object containing the SOL balance in both BigNumber and human-readable format.
     */
    public async getSOLBalance(accountAddress: string, connection?: Connection): Promise<{
        balanceBn: BigNumber;
        balanceHuman: BigNumber;
    }> {
        const balance = connection ? await connection.getBalance(
            new PublicKey(accountAddress)
        ) : await this.__connection.getBalance(
            new PublicKey(accountAddress)
        );
        return {
            balanceBn: new BigNumber(balance),
            balanceHuman: new BigNumber(balance).div(10 ** this.SOL_DECIMALS)
        }
    }

    /**
     * Creates a new Solana account and adds it to the store.
     *
     * @method createNew
     * @async
     * @returns {Promise<SolanaAccount>} - A Promise that resolves to the newly created Solana account.
     */
    public async createNew(): Promise<SolanaAccount> {
        const mnemonic = bip39.generateMnemonic();
        const keyPair = await solanaMnemonicToSecretkey(mnemonic);
        const wallet = Keypair.fromSecretKey(keyPair);

        const solAccount: SolanaAccount = {
            addr: wallet.publicKey.toString(),
            sk: wallet.secretKey,
            pk: wallet.publicKey,
            mnemonic: mnemonic,
        };

        this.add(solAccount.sk);
        return solAccount;
    }

    /**
     * Creates a new Solana account with a prefix and adds it to the store.
     *
     * @method createNewWithPrefix
     * @async
     * @param {string} prefix - The prefix to use for generating the account address.
     * @param {number} [tries=10000] - The maximum number of tries to generate a unique account address with the given prefix (optional, defaults to 10000).
     * @returns {Promise<SolanaAccount|undefined>} - A Promise that resolves to the newly created Solana account with the specified prefix, or undefined if a unique account address could not be generated within the specified number of tries.
     */
    public async createNewWithPrefix(prefix: string, tries = 10000): Promise<SolanaAccount | undefined> {
        for (let i = 0; i < tries; i++) {
            const mnemonic = bip39.generateMnemonic();
            const keyPair = await solanaMnemonicToSecretkey(mnemonic);
            const wallet = Keypair.fromSecretKey(keyPair);
            const address = wallet.publicKey.toString();

            if (address.startsWith(prefix)) {
                const accountToAdd: SolanaAccount = {
                    addr: wallet.publicKey.toString(),
                    sk: wallet.secretKey,
                    pk: wallet.publicKey
                };

                this.add(accountToAdd.sk);
                return accountToAdd
            }
        }

        console.log(`Could not find a wallet with prefix: ${prefix}`);
        return undefined;
    }

    /**
     * Retrieves a Solana account from the store based on the account address.
     *
     * @method get
     * @param {string} account - The account address for which to retrieve the Solana account.
     * @returns {SolanaAccount|undefined} - The retrieved Solana account, or undefined if the account is not found in the store.
     */
    get (account: string): SolanaAccount | undefined {
        return this.__accounts.get(account)
    }
 
    /**
     * Retrieves the SPL token balance for a given owner's account.
     *
     * @method getSPLTokenBalance
     * @async
     * @param {string} owner - The owner's address for which to retrieve the SPL token balance.
     * @param {BridgeTokenConfig} tokenConfig - The configuration for the SPL token.
     * @param {Connection} connection - The Solana connection object to use for retrieving the balance.
     * @returns {Promise<{ balanceBn: BigNumber, balanceHuman: BigNumber }>} - A Promise that resolves to an object containing the SPL token balance in both BigNumber and human-readable format.
     */
    async getSPLTokenBalance(
        owner: string,
        tokenConfig: BridgeTokenConfig,
        connection : Connection
    ): Promise<{
        balanceBn: BigNumber;
        balanceHuman: BigNumber;
    }> {
        let tokenAccount; 

        try {
            tokenAccount = await getAssociatedTokenAccount(
                owner,
                tokenConfig,
                connection
            );
        } catch (error) {
            console.error(error)
        }

        if (!tokenAccount) {
            return {
                balanceBn: new BigNumber(0),
                balanceHuman: new BigNumber(0)
            }
        }

        const unitsContext = connection ? await connection.getTokenAccountBalance(
            tokenAccount.address
        ) : await this.__connection.getTokenAccountBalance(
            tokenAccount.address
        );

        return {
            balanceBn: new BigNumber(unitsContext.value.amount),
            balanceHuman: new BigNumber(unitsContext.value.amount).div(
                10 ** unitsContext.value.decimals
            )
        }
    }

    /**
     * Requests an airdrop of SOL tokens to a given account.
     *
     * @method requestAirDrop
     * @async
     * @param {SolanaAccount} signer - The Solana account requesting the airdrop.
     * @param {number} [amount=1000000000] - The amount of SOL tokens to request for the airdrop (optional, defaults to 1,000,000,000).
     * @param {Connection} connection - The Solana connection object to use for requesting the airdrop.
     * @returns {Promise<string>} - A Promise that resolves to the transaction signature of the airdrop request.
     */
    async requestAirDrop(signer: SolanaAccount, amount = 1_000_000_000, connection : Connection): Promise<string> {
        const airdropTx = connection ? await connection.requestAirdrop(signer.pk, amount) : await this.__connection.requestAirdrop(signer.pk, amount);
        return airdropTx
    }

}
