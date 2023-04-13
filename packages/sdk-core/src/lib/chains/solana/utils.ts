import * as bip39 from "bip39";
import * as nacl from "tweetnacl";
import {derivePath} from "ed25519-hd-key";

/**
 * Convert a phrase to secret key of Solana
 * @param {string} phrase BIP39 Phrase
 * @returns {Promise<Uint8Array>}
 */
export async function solanaMnemonicToSecretkey(phrase: string): Promise<Uint8Array> {
    const seed = await bip39.mnemonicToSeed(phrase);
    const seedBuffer = Buffer.from(seed).toString("hex");
    const path44Change = `m/44'/501'/0'/0'`;
    const derivedSeed = derivePath(path44Change, seedBuffer).key;

    const sk = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
    return sk;
}