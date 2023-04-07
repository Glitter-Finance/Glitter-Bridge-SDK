import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {SolanaAccountsConfig} from "../../types";
import {PublicKey} from "@solana/web3.js";

const ACCOUNT_SEED = "glitter"

export async function getSolEscrowAccount(
    solanaAccountsConfig: SolanaAccountsConfig,
    account: PublicKey
): Promise<PublicKey> {
    const bridgeProgram = new PublicKey(solanaAccountsConfig.bridgeProgram);
    const seeds = [Buffer.from(ACCOUNT_SEED, "utf-8"), account.toBuffer()];
    const [solanaEscrowAccount] = await PublicKey.findProgramAddress(seeds, bridgeProgram);
    return solanaEscrowAccount;
}

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

export async function getAssetInfoAccount(
    solanaAccountsConfig: SolanaAccountsConfig,
    account: PublicKey, mintAccount: PublicKey): Promise<PublicKey> {
    const bridgeProgram = new PublicKey(solanaAccountsConfig.bridgeProgram);
    const seeds = [Buffer.from(ACCOUNT_SEED, "utf-8"), account.toBuffer(), mintAccount.toBuffer()];
    const [assetInfoAccount] = await PublicKey.findProgramAddress(seeds, bridgeProgram);
    return assetInfoAccount;
}

export async function getTokenAccount(account: PublicKey, mintAccount: PublicKey): Promise<PublicKey> {
    const seeds = [account.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAccount.toBuffer()];
    const [solanaUserAtaAccount] = await PublicKey.findProgramAddress(seeds, ASSOCIATED_TOKEN_PROGRAM_ID);
    console.log("solanaUserAtaAccount: " + solanaUserAtaAccount.toString());
    return solanaUserAtaAccount;
}