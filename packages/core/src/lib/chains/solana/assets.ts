import {
    Account,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { ConfirmOptions, Connection, PublicKey, sendAndConfirmTransaction, Signer, Transaction } from "@solana/web3.js";
import { BridgeToken } from "../../common";

export type SolanaAsset = {
    name: string;
};

export class SolanaAssets {
    private _assets: Record<string, SolanaAsset> = {};
    private _client?: Connection;

    //Setters
    public constructor(client: Connection) {
        this._client = client;
    }

    public async getTokenAddress(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
        const allowOwnerOffCurve = false;
        const programId = TOKEN_PROGRAM_ID;
        const associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID;

        const associatedToken = await getAssociatedTokenAddress(
            mint,
            owner,
            allowOwnerOffCurve,
            programId,
            associatedTokenProgramId
        );
        return associatedToken;
    }
    async createTokenAccount(signer: Signer, owner: PublicKey, token: BridgeToken): Promise<Account> {
        //Fail safe
        if (!token) throw new Error("Token not found");
        if (!token.address) throw new Error("Token address not found");
        if (typeof token.address !== "string") throw new Error("Token address not found in string format");
        if (!this._client) throw new Error("Solana Client not found");

        //Mint Address
        const mintAddress = new PublicKey(token.address);

        //Get Associated Token Account
        const address = await this.getTokenAddress(mintAddress, signer.publicKey);
        if (!address) throw new Error("Associated Token Address not found");

        const programId = TOKEN_PROGRAM_ID;
        const associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID;

        const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                signer.publicKey,
                address,
                owner,
                mintAddress,
                programId,
                associatedTokenProgramId
            )
        );

        await sendAndConfirmTransaction(this._client, transaction, [signer], {
            commitment: "finalized",
        } as ConfirmOptions);

        //Get Account
        const account = await this.getTokenAccount(owner, token);
        if (!account) throw new Error("Account not found");

        console.log(`Created Token Account ${address.toBase58()}`);
        return account;
    }
    async getTokenAccount(owner: PublicKey, token: BridgeToken): Promise<Account | undefined> {
        //Fail safe
        if (!token) throw new Error("Token not found");
        if (!token.address) throw new Error("Token address not found");
        if (typeof token.address !== "string") throw new Error("Token address not found in string format");
        if (!this._client) throw new Error("Solana Client not found");

        //Mint Address
        const mintAddress = new PublicKey(token.address);

        //Get Associated Token Account
        const address = await this.getTokenAddress(mintAddress, owner);
        if (!address) throw new Error("Associated Token Address not found");

        const programId = TOKEN_PROGRAM_ID;

        //Get Account
        try {
            const account = await getAccount(this._client, address, "processed", programId);
            return account;
        } catch (error) {
            console.log("Could not find account");
            return undefined;
        }
    }
}
