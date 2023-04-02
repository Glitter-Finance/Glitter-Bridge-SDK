import * as solanaWeb3 from "@solana/web3.js";
import {Connection, Keypair, Signer, sendAndConfirmTransaction} from "@solana/web3.js";

import {BridgeTokenConfig} from "src/lib/common";
import {ASSOCIATED_TOKEN_PROGRAM_ID, Account, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, getMint} from "@solana/spl-token";
import {PublicKey} from "@solana/web3.js";
import {solanaMnemonicToSecretkey} from "./utils";
import * as bip39 from "bip39"

export type SolanaAccount = {
    addr: string;
    sk: Uint8Array;
    pk: PublicKey;
    balance?: number;
    mnemonic?: string;
};

export class SolanaAccountsStore {
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
     * 
     * @param args 
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
     * 
     * @param accountAddress 
     * @returns 
     */
    public async getBalance(accountAddress: string): Promise<SolanaAccount> {
        const account = this.get(accountAddress);
        if (!account) {return Promise.reject(new Error('Account has not been added to AccountStore')) }
        const balance = await this.__connection.getBalance(account.pk);
        account.balance = balance
        return account;
    }
    /**
     * 
     * @returns 
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
     * 
     * @param prefix 
     * @param tries 
     * @returns 
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
     * 
     * @param account 
     * @returns 
     */
    get (account: string): SolanaAccount | undefined {
        return this.__accounts.get(account)
    }
    /**
     * 
     * @param owner 
     * @param solanaTokenConfig 
     * @returns 
     */
    async getTokenAaddress(
        owner: string,
        solanaTokenConfig: BridgeTokenConfig
    ): Promise<PublicKey> {
        const mintAddress = await getMint(this.__connection, new PublicKey(solanaTokenConfig.address));
        const tokenAccountAddress = await getAssociatedTokenAddress(new PublicKey(mintAddress), new PublicKey(owner))
        return tokenAccountAddress
    }
    /**
     * 
     * @param owner 
     * @param solanaTokenConfig 
     * @returns 
     */
    async getTokenAccount(
        owner: string,
        solanaTokenConfig: BridgeTokenConfig
    ): Promise<Account> {
        const associatedTokenAccountAddress = await this.getTokenAaddress(
            owner, 
            solanaTokenConfig
        )

        const tokenAccount = await getAccount(this.__connection, 
            associatedTokenAccountAddress,
            "processed",
            TOKEN_PROGRAM_ID
        )

        return tokenAccount
    }
    /**
     * 
     * @param signer 
     * @param owner 
     * @param tokenConfig 
     * @returns 
     */
    async createTokenAccount(signer: Signer, owner: PublicKey, tokenConfig: BridgeTokenConfig): Promise<Account> {
        const mintAddress = new PublicKey(tokenConfig.address);
        const address = await this.getTokenAaddress(signer.publicKey.toString(), tokenConfig);
        const programId = TOKEN_PROGRAM_ID;
        const associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID;

        const transaction = new solanaWeb3.Transaction().add(
            createAssociatedTokenAccountInstruction(
                signer.publicKey,
                address,
                owner,
                mintAddress,
                programId,
                associatedTokenProgramId
            )
        );

        await sendAndConfirmTransaction(this.__connection, transaction, [signer], {
            commitment: "finalized",
        });

        const account = await this.getTokenAccount(owner.toString(), tokenConfig)
        return account;
    }
}
