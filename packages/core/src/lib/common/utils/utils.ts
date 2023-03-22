import { PublicKey } from "@solana/web3.js";
import algosdk from "algosdk";
import * as readline from "readline";

// export class InputParams {
//     static get(field: string): string | undefined {
//         const argv = minimist(process.argv.slice(2));
//         return argv[field];
//     }
// }

export function Sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @deprecated The method should not be used
 */
export function Precise(value: number | string, precision = 21): number {
    if (typeof value === "string") {
        return Number(parseFloat(value).toPrecision(precision));
    } else {
        return Number(parseFloat(value.toString()).toPrecision(precision));
    }
}
/**
 * @deprecated The method should not be used
 */
export function PreciseDecimals(value: number | string, decimals = 2): number {
    return Number(Precise(value).toFixed(decimals));
}

export function LogProgress(progress: string) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(progress);
}

export const base64ToString = (encoded: any) => {
    return Buffer.from(encoded, "base64").toString();
};
export const base64To0xString = (encoded: any) => {
    return `0x${Buffer.from(encoded, "base64").toString("hex")}`;
};
export const base64ToBigUIntString = (encoded: any) => {
    return Buffer.from(encoded, "base64").readBigUInt64BE().toString();
};

function instanceofAlgoAccount(account: any): boolean {
    return "addr" in account && "sk" in account;
}

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
