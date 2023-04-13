import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAccount, getAssociatedTokenAddress, getMint} from "@solana/spl-token";
import {Account, Connection, PublicKey, Transaction, sendAndConfirmTransaction} from "@solana/web3.js";
import {BridgeTokenConfig, Routing, RoutingHelper} from "../../../common";

export async function sendTokenTransaction(
    routing: Routing,
    senderTokenAccount: PublicKey,
    recipientTokenAccount: PublicKey,
    token: BridgeTokenConfig
): Promise<Transaction> {
    if (!routing.amount) throw new Error("Routing Amount not found");
    if (!token) throw new Error("Token not found");

    const txn = new Transaction().add(
        createTransferCheckedInstruction(
            senderTokenAccount,
            new PublicKey(token.address),
            recipientTokenAccount,
            new PublicKey(routing.from.address),
            RoutingHelper.BaseUnits_FromReadableValue(routing.amount, token.decimals).toNumber(),
            token.decimals
        )
    );

    return txn;
}

export async function closeTokenAccountTransaction(senderAccount: PublicKey, senderTokenAccount: PublicKey): Promise<Transaction> {
    const tx = new Transaction();
    tx.add(
        createCloseAccountInstruction(
            senderTokenAccount,
            senderAccount,
            senderAccount,
            []
        )
    );
    tx.feePayer = senderAccount;

    return tx
}
/**
 * 
 * @param owner 
 * @param solanaTokenConfig 
 * @param connection 
 * @returns 
 */
export async function generateAssociatedTokenAccountAddress(
    owner: string,
    solanaTokenConfig: BridgeTokenConfig,
    connection: Connection
): Promise<PublicKey> {
    const mintAddress = await getMint(connection, new PublicKey(solanaTokenConfig.address));
    const tokenAccountAddress = await getAssociatedTokenAddress(new PublicKey(mintAddress.address), new PublicKey(owner))
    return tokenAccountAddress
}
/**
 * 
 * @param owner 
 * @param solanaTokenConfig 
 * @returns 
 */
export async function getAssociatedTokenAccount(
    owner: string,
    solanaTokenConfig: BridgeTokenConfig,
    connection: Connection
) {
    const associatedTokenAccountAddress = await generateAssociatedTokenAccountAddress(
        owner, 
        solanaTokenConfig,
        connection
    )

    const tokenAccount = await getAccount(
        connection,
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
export async function createAssociatedTokenAccountTransaction(owner: string, tokenConfig: BridgeTokenConfig, connection: Connection): Promise<Transaction> {
    const ownerPk = new PublicKey(owner)
    const mintAddress = new PublicKey(tokenConfig.address);
    const address = await generateAssociatedTokenAccountAddress(owner, tokenConfig, connection);
    const programId = TOKEN_PROGRAM_ID;
    const associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID;

    const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
            ownerPk,
            address,
            ownerPk,
            mintAddress,
            programId,
            associatedTokenProgramId
        )
    );

    return transaction
}