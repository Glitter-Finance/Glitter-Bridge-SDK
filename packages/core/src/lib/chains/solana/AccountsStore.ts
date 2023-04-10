import * as solanaWeb3 from "@solana/web3.js";
import {Connection, Keypair} from "@solana/web3.js";
import {BridgeTokenConfig} from "../../common";
import {getMint} from "@solana/spl-token";
import {PublicKey} from "@solana/web3.js";
import {solanaMnemonicToSecretkey} from "./utils";
import * as bip39 from "bip39"
import BigNumber from "bignumber.js";
import {getAssociatedTokenAccount} from "./transactions";

export type SolanaAccount = {
    addr: string;
    sk: Uint8Array;
    pk: PublicKey;
    balance?: number;
    mnemonic?: string;
};

export class SolanaAccountsStore {
    SOL_DECIMALS = 9
    private __accounts: Map<string, SolanaAccount>;
    private __connection: Connection;
    /**
     * 
     * @param connection 
     */
    public constructor(connection: Connection) {
        this.__connection = connection;
        this.__accounts = new Map();
    }
    /**
     * Add an account to use for transactions
     * @param {[sk: Uint8Array | undefined] | [mnemonic: string | undefined]} args
     * @returns 
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
     * Get SOL Balance of an address
     * @param {string} accountAddress 
     * @returns {Promise<{ balanceBn: BigNumber; balanceHuman: BigNumber; }>}
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
     * Create and add a sol account to use for transactions
     * @returns {Promise<SolanaAccount>}
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
     * Create and add a sol account to use for transactions with a prefix
     * @param {string} prefix adress prefix 
     * @param {number} tries default  10000
     * @returns {Promise<SolanaAccount | undefined>}
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
     * Returns Solana account
     * @param {string} account 
     * @returns {SolanaAccount | undefined}
     */
    get (account: string): SolanaAccount | undefined {
        return this.__accounts.get(account)
    }
    /**
     * Provides SPL token balance
     * @param {string} owner 
     * @param {BridgeTokenConfig} tokenConfig 
     * @returns {Promise<{ balanceBn: BigNumber; balanceHuman: BigNumber; }>}
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
     * Request test SOL
     * @param {SolanaAccount} signer 
     * @param {number} amount default 1_000_000_000
     * @returns 
     */
    async requestAirDrop(signer: SolanaAccount, amount = 1_000_000_000, connection : Connection): Promise<string> {
        const airdropTx = connection ? await connection.requestAirdrop(signer.pk, amount) : await this.__connection.requestAirdrop(signer.pk, amount);
        return airdropTx
    }

}
