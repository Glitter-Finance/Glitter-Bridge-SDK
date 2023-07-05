import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SolanaAccountsConfig } from "../../types";
import { PublicKey } from "@solana/web3.js";

const ACCOUNT_SEED = "glitter"

/**
 * Retrieves the Solana escrow account for the specified account.
 *
 * @param {SolanaAccountsConfig} solanaAccountsConfig - The Solana accounts configuration.
 * @param {PublicKey} account - The account public key.
 * @returns {Promise<PublicKey>} - A promise that resolves with the Solana escrow account public key.
 */
export async function getSolEscrowAccount(
    solanaAccountsConfig: SolanaAccountsConfig,
    account: PublicKey
): Promise<PublicKey> {
    const bridgeProgram = new PublicKey(solanaAccountsConfig.bridgeProgram);
    const seeds = [Buffer.from(ACCOUNT_SEED, "utf-8"), account.toBuffer()];
    const [solanaEscrowAccount] = await PublicKey.findProgramAddress(seeds, bridgeProgram);
    return solanaEscrowAccount;
}

/**
 * Retrieves the token escrow account for a given Solana account.
 *
 * @param {SolanaAccountsConfig} solanaAccountsConfig - The Solana accounts configuration.
 * @param {PublicKey} account - The Solana account for which to retrieve the token escrow account.
 * @returns {Promise<PublicKey>} - A Promise that resolves to the token escrow account's PublicKey.
 */
export async function getTokenEscrowAccount(
    solanaAccountsConfig: SolanaAccountsConfig,
    account: PublicKey
): Promise<PublicKey> {
    const bridgeProgram = new PublicKey(solanaAccountsConfig.bridgeProgram);
    const solanaEscrowAccount = await getSolEscrowAccount(solanaAccountsConfig, account);
    const seeds = [Buffer.from(ACCOUNT_SEED, "utf-8"), solanaEscrowAccount.toBuffer(), account.toBuffer()];
    const [solanaEscrowTokenAccount] = await PublicKey.findProgramAddress(seeds, bridgeProgram);
    return solanaEscrowTokenAccount;
}

/**
 * Retrieves the asset info account for a given Solana account and mint account.
 *
 * @param {SolanaAccountsConfig} solanaAccountsConfig - The Solana accounts configuration.
 * @param {PublicKey} account - The Solana account for which to retrieve the asset info account.
 * @param {PublicKey} mintAccount - The mint account associated with the asset.
 * @returns {Promise<PublicKey>} - A Promise that resolves to the asset info account's PublicKey.
 */
export async function getAssetInfoAccount(
    solanaAccountsConfig: SolanaAccountsConfig,
    account: PublicKey, mintAccount: PublicKey): Promise<PublicKey> {
    const bridgeProgram = new PublicKey(solanaAccountsConfig.bridgeProgram);
    const seeds = [Buffer.from(ACCOUNT_SEED, "utf-8"), account.toBuffer(), mintAccount.toBuffer()];
    const [assetInfoAccount] = await PublicKey.findProgramAddress(seeds, bridgeProgram);
    return assetInfoAccount;
}

/**
 * Retrieves the token account for a given account and mint account.
 *
 * @param {PublicKey} account - The account for which to retrieve the token account.
 * @param {PublicKey} mintAccount - The mint account associated with the token.
 * @returns {Promise<PublicKey>} - A Promise that resolves to the token account's PublicKey.
 */
export async function getTokenAccount(account: PublicKey, mintAccount: PublicKey): Promise<PublicKey> {
    const seeds = [account.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAccount.toBuffer()];
    const [solanaUserAtaAccount] = await PublicKey.findProgramAddress(seeds, ASSOCIATED_TOKEN_PROGRAM_ID);
    console.log("solanaUserAtaAccount: " + solanaUserAtaAccount.toString());
    return solanaUserAtaAccount;
}