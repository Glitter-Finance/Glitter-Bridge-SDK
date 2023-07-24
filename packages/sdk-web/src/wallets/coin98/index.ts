import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { ChainNames } from "../Chains";
import { CodeStatus } from "../metamask/CodeStatusEnum";

declare global {
    interface Window {
        coin98?: any;
    }
}

export class Coin98 {
    public chain: typeof ChainNames.SOLANA | typeof ChainNames.ETHEREUM | typeof ChainNames.POLYGON | typeof ChainNames.ALGORAND;
    public provider: any;
    public methods = {
        [ChainNames.SOLANA]: {
            accounts: "sol_accounts",
            sign: "sol_sign",
            verify: "sol_verify",
            send: "sendTransaction",
        }
    }

    constructor(chain:  typeof ChainNames.SOLANA |  typeof ChainNames.ETHEREUM |  typeof ChainNames.POLYGON |  typeof ChainNames.ALGORAND) {
        this.chain = chain;
        if (chain === ChainNames.SOLANA) {
            this.provider = window.coin98.sol;
        } else {
            this.provider = window.ethereum;
        }
    }

    async connect(): Promise<any> {
        if (this.provider) {
            if (this.chain === ChainNames.SOLANA) {
                const account = await this.provider.request({
                    method: this.methods[ChainNames.SOLANA].accounts,
                });
                return account;
            } else {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                return {code: CodeStatus.SUCCESS, data: accounts};
            }
        } else {
            throw "Coin98 Wallet Extension Not Installed";
        }
    }

    async getProvider() {
        return this.provider;
    }

    async requestSigning(transaction: Transaction, provider = this.provider): Promise<any> {
        if (provider) {
            const signature = await provider.request({
                method: this.methods[ChainNames.SOLANA].sign,
                params: [transaction],
            });

            return signature;
        } else {
            throw "Coin98 Wallet Extension Not Installed";
        }
    }

    async sendTransaction(signature: any, transaction: Transaction, provider = this.provider) {
        if (provider) {
            await provider.request({
                method: this.methods[ChainNames.SOLANA].verify,
                params: [signature, transaction.serializeMessage()],
            });

            const encodedTx = bs58.encode(transaction.serializeMessage());
            const transactionResponse = await provider.request({
                method: this.methods[ChainNames.SOLANA].send,
                params: [encodedTx],
            });
            return transactionResponse;
        } else {
            throw "Coin98 Wallet Extension Not Installed";
        }
    }
}
