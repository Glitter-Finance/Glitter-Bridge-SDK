import * as bip39 from "bip39";
import * as nacl from "tweetnacl";
import {derivePath} from "ed25519-hd-key";
import {Commitment} from "@solana/web3.js";

export type DepositNote = {
    system: string;
    date: string;
};
export const COMMITMENT = "singleGossip";
export const defaultCommitment = "confirmed" as Commitment;
export class SolanaUtils {
    public static async mnemonicToSecretKey(mnemonic: string): Promise<Uint8Array> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!mnemonic) {
                    throw new Error("DEV_SOLANA_ACCOUNT_TEST not set");
                }

                //Convert seed to Uint8Array
                const seed = await bip39.mnemonicToSeed(mnemonic);
                const seedBuffer = Buffer.from(seed).toString("hex");
                const path44Change = `m/44'/501'/0'/0'`;
                const derivedSeed = derivePath(path44Change, seedBuffer).key;

                const sk = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
                if (!sk) {
                    throw new Error("Solana Wallet not found");
                }

                resolve(sk);
            } catch (error) {
                reject(error);
            }
        });
    }
    public static generateMnemonic(): string {
        const mnemonic = bip39.generateMnemonic();
        return mnemonic;
    }
    public static getWordList(): string[] {
        const wordList = bip39.wordlists.EN;
        return wordList;
    }
}
