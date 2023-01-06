import { Account, Connection, Keypair, PublicKey, Signer, SystemProgram, Transaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT, createCloseAccountInstruction, getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction } from "@solana/spl-token";
import * as util from "util";
import { BridgeToken, BridgeTokens, Routing, ValueUnits } from "../../_common";

export class SolanaTxns {

    private _client?: Connection;
    private _solToken: BridgeToken | undefined;

    //Setters
    public constructor(client: Connection) {
        this._client = client;
    }

    public get SolToken(): BridgeToken | undefined {
        if (!this._solToken) {
            this._solToken = BridgeTokens.get("solana", "sol");
        }
        return this._solToken;
    }

    public sendSolTransaction(routing: Routing): Transaction {
        if (!this._client) throw new Error('Solana Client not found');
        if (!routing) throw new Error('Routing not found');
        if (!routing.amount) throw new Error('Amount not found');

        //Get Sol Token
        const solToken = this.SolToken;
        if (!solToken) throw new Error('Sol Token not found');

        const txn = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(routing.from.address),
                toPubkey: new PublicKey(routing.to.address),
                lamports: ValueUnits.fromValue(routing.amount, solToken.decimals).units, // 1 SOL = 1,000,000,000 lamports
            })
        );
        return (txn);
    }
    public sendTokenTransaction(
        routing: Routing,
        senderTokenAccount: PublicKey,
        recipientTokenAccount: PublicKey,
        token: BridgeToken): Transaction {

        if (!this._client) throw new Error('Solana Client not found');
        if (!routing) throw new Error('Routing not found');
        if (!routing.amount) throw new Error('Amount not found');
        if (!token) throw new Error('Token not found');
        if (!token.address) throw new Error('Token address not found');
        if (typeof token.address !== "string") throw new Error('Token address not found in string format');

        const txn = new Transaction().add(
            createTransferCheckedInstruction(
                senderTokenAccount,
                new PublicKey(token.address),
                recipientTokenAccount,
                new PublicKey(routing.from.address),
                ValueUnits.fromValue(routing.amount, token.decimals).units,
                token.decimals
            )
        );
        return txn;
    };
    public closeTokenAccountTransaction(
        senderAccount: PublicKey,
        senderTokenAccount: PublicKey
    ) {

        let tx = new Transaction();
        tx.add(
            createCloseAccountInstruction(
                senderTokenAccount, // to be closed token account
                senderAccount, // rent's destination
                senderAccount, // token account authority
                [] // multisig
            )
        );
        tx.feePayer = senderAccount;
    }

    //Callers


    // static async sendTokenTransaction(routing: Routing,
    //     token: BridgeToken): Promise<Transaction> {
    //     // eslint-disable-next-line no-async-promise-executor
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             if (!this._client) throw new Error('Solana Client not found');
    //             if (!routing) throw new Error('Routing not found');
    //             if (!routing.amount) throw new Error('Amount not found');

    //             //Get Signer                
    //             if (!token.address) throw new Error("token address is required");
    //             if (typeof token.address !== "string") throw new Error("address is required in string format");

    //             //Get Token Account                
    //             const tokenAccount = SolanaAccounts.getTokenAccount(routing.from.address, token.symbol);
    //             if (!tokenAccount) throw new Error("token account not found");

    //             const txn = new Transaction().add(
    //                 tokenAccount.transfer({
    //                     fromPubkey: new PublicKey(routing.from.address),
    //                     toPubkey: new PublicKey(routing.to.address),
    //                     owner: new PublicKey(routing.from.address),
    //                     amount: new BigIntShift(routing.amount, token.decimals).value,
    //                 })
    //             );
    //             resolve(txn);
    //         } catch (error) {
    //             reject(error);
    //         }

    //     });
    // }


    // static async closeOutTokenTransaction(tokenOwner: SolanaAccount,
    //     rentReceiver: SolanaAccount | undefined,
    //     tokenAccount: SolanaTokenAccount): Promise<Transaction> {
    //     return new Promise(async (resolve, reject) => {
    //         try {

    //             if (!rentReceiver) rentReceiver = tokenOwner;

    //             let txn = new Transaction();
    //             txn.add(
    //                 createCloseAccountInstruction(
    //                     tokenAccount.pk, // to be closed token account
    //                     rentReceiver.pk, // rent's destination
    //                     tokenOwner.pk, // token account authority
    //                     [] // multisig
    //                 )
    //             );
    //             txn.feePayer = tokenOwner.pk;

    //             resolve(txn);
    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // }


    // static async closeOutTokenAccount(signer: SolanaAccount,
    //     receiver: SolanaAccount,
    //     token: BridgeToken): Promise<boolean> {
    //     // eslint-disable-next-line no-async-promise-executor
    //     return new Promise(async (resolve, reject) => {
    //         try {


    //             //Fail Safe
    //             if (!token) throw new Error('Token not found');
    //             if (!this._client) throw new Error('Solana Client not found');

    //             console.log(`Closing out token account for ${signer.addr} to ${receiver}`);

    //             //Get Signer                
    //             if (!token.address) throw new Error("asset_id is required");
    //             if (typeof token.address !== "number") throw new Error("address is required in number format");

    //             //Get Token Account                
    //             const tokenAccount = SolanaAccounts.getTokenAccount(signer.addr, token.symbol);
    //             if (!tokenAccount) throw new Error("token account not found");

    //             const txn = await this.closeOutTokenTransaction(signer, receiver, tokenAccount);
    //             const result = await this._client.sendTransaction(txn,
    //                 [SolanaAccounts.getSignerObject(signer)])

    //             //Send Txn
    //             console.log(`Token Closeout Completed ${result}`);
    //             resolve(true);

    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // }


}

