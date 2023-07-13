import { PublicKey } from "@solana/web3.js";
import algosdk, { decodeAddress, isValidAddress } from "algosdk";
import * as readline from "readline";

/**
 * Pauses the execution for the specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A Promise that resolves after the specified number of milliseconds.
 */
export function Sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns the precise representation of a number with the specified precision.
 * @param {number | string} value - The value to convert to a precise number.
 * @param {number} [precision=21] - The desired precision.
 * @returns {number} The precise representation of the value.
 */
export function Precise(value: number | string, precision = 21): number {
    if (typeof value === "string") {
        return Number(parseFloat(value).toPrecision(precision));
    } else {
        return Number(parseFloat(value.toString()).toPrecision(precision));
    }
}

/**
 * Returns the precise representation of a number with the specified number of decimal places.
 * @param {number | string} value - The value to convert to a precise number.
 * @param {number} [decimals=2] - The desired number of decimal places.
 * @returns {number} The precise representation of the value with the specified number of decimal places.
 */
export function PreciseDecimals(value: number | string, decimals = 2): number {
    return Number(Precise(value).toFixed(decimals));
}

/**
 * Logs the progress message.
 * @param {string} progress - The progress message to log.
 * @returns {void}
 */
export function LogProgress(progress: string) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(progress);
}

/**
 * Converts a base64 encoded string to a regular string.
 * @param {any} encoded - The base64 encoded string to convert.
 * @returns {string} - The converted regular string.
 */
export const base64ToString = (encoded: any) => {
    return Buffer.from(encoded, "base64").toString();
};

/**
 * Converts a base64 encoded string to a 0x-prefixed hexadecimal string.
 * @param {any} encoded - The base64 encoded string to convert.
 * @returns {string} - The converted 0x-prefixed hexadecimal string.
 */
export const base64To0xString = (encoded: any) => {
    return `0x${Buffer.from(encoded, "base64").toString("hex")}`;
};

/**
 * Converts a base64 encoded string to a big unsigned integer string.
 * @param {any} encoded - The base64 encoded string to convert.
 * @returns {string} - The converted big unsigned integer string.
 */
export const base64ToBigUIntString = (encoded: any) => {
    return Buffer.from(encoded, "base64").readBigUInt64BE().toString();
};

/**
 * Checks if an object is an instance of algosdk.Account.
 * @param {any} account - The object to check.
 * @returns {boolean} - True if the object is an instance of algosdk.Account, false otherwise.
 */
export function instanceofAlgoAccount(account: any): account is algosdk.Account {
    if(typeof account !=="object" || account == null) return false
    return "addr" in account && "sk" in account && isValidAddress(account.addr);
}

/**
 * Converts a wallet representation to an address string.
 * @param {string | PublicKey | algosdk.Account} wallet - The wallet representation.
 * @returns {string} - The address string.
 */
export function walletToAddress(wallet: string | PublicKey | algosdk.Account): string {
    let destinationInStr: string | null = null;
    if (typeof wallet === "object") {
        if (wallet instanceof PublicKey) {
            destinationInStr = wallet.toBase58();
        } else if (instanceofAlgoAccount(wallet)) {
            destinationInStr = (wallet as algosdk.Account).addr;
        }
    } else if (typeof wallet === "string") {
        destinationInStr = wallet as string;
    }

    if (!destinationInStr) {
        throw new Error("Unsupported Wallet Type");
    }

    return destinationInStr;
}

/**
 * Converts an address representation to a public key buffer.
 * @param {string | PublicKey | algosdk.Account} addr - The address representation.
 * @returns {Buffer} - The public key buffer.
 */
export const addr_to_pk=(addr:string| PublicKey | algosdk.Account):Buffer=>{
    if (addr instanceof PublicKey) return addr.toBuffer();
    if (instanceofAlgoAccount(addr)) return Buffer.from(decodeAddress(addr.addr).publicKey);
    if(typeof addr !=="string") throw new Error("unsupported address for bridge v2") ;
    if(addr.startsWith("0x")) return Buffer.from(addr.slice(2), "hex");
    return Buffer.from(addr, "hex");
}

export function StringToEnum<T extends string, E extends { [key: string]: T }>(
    str: string,
    enumType: E
): E[keyof E] | undefined {
    
    for (const [key, value] of Object.entries(enumType)){
        if (value.toLowerCase() === str.toLowerCase()) return enumType[key as keyof E];
        if (key.toLowerCase() === str.toLowerCase()) return enumType[key as keyof E];
    }
    return undefined;
}