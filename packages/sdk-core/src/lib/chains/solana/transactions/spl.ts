import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAccount, getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { BridgeTokenConfig, Routing, RoutingHelper } from "../../../common";

/**
 * Sends a token transaction using the provided routing information.
 *
 * @param {Routing} routing - The routing information for the transaction.
 * @param {PublicKey} senderTokenAccount - The sender's token account public key.
 * @param {PublicKey} recipientTokenAccount - The recipient's token account public key.
 * @param {BridgeTokenConfig} token - The configuration for the token.
 * @returns {Promise<Transaction>} - A Promise that resolves to the sent token transaction.
 */
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

/**
 * Creates a transaction to close a token account.
 *
 * @param {PublicKey} senderAccount - The public key of the sender's account.
 * @param {PublicKey} senderTokenAccount - The public key of the sender's token account to be closed.
 * @returns {Promise<Transaction>} - A Promise that resolves to the transaction to close the token account.
 */
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
 * Generates the associated token account address for a given owner.
 *
 * @param {string} owner - The owner's address for which to generate the associated token account address.
 * @param {BridgeTokenConfig} solanaTokenConfig - The configuration for the Solana token.
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<PublicKey>} - A Promise that resolves to the generated associated token account address.
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
 * Retrieves the associated token account for a given owner.
 *
 * @param {string} owner - The owner's address for which to retrieve the associated token account.
 * @param {BridgeTokenConfig} solanaTokenConfig - The configuration for the Solana token.
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<PublicKey>} - A Promise that resolves to the associated token account's PublicKey.
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
 * Creates a transaction to create an associated token account for a given owner.
 *
 * @param {string} owner - The owner's address for which to create the associated token account.
 * @param {BridgeTokenConfig} tokenConfig - The configuration for the token.
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<Transaction>} - A Promise that resolves to the transaction to create the associated token account.
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