import * as bip39 from "bip39";
import * as nacl from "tweetnacl";
import { derivePath } from "ed25519-hd-key";

/**
 * Converts a Solana mnemonic phrase to a secret key represented as a Uint8Array.
 *
 * @function solanaMnemonicToSecretkey
 * @async
 * @param {string} phrase - The Solana mnemonic phrase.
 * @returns {Promise<Uint8Array>} - A Promise that resolves to the secret key represented as a Uint8Array.
 */
export async function solanaMnemonicToSecretkey(phrase: string): Promise<Uint8Array> {
    const seed = await bip39.mnemonicToSeed(phrase);
    const seedBuffer = Buffer.from(seed).toString("hex");
    const path44Change = `m/44'/501'/0'/0'`;
    const derivedSeed = derivePath(path44Change, seedBuffer).key;

    const sk = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
    return sk;
}