import { ParsedTransactionWithMeta, TokenBalance } from "@solana/web3.js";
import { GlitterSDKServer } from "../../glitterSDKServer";

export class SolanaPollerCommon {
    //Get solana address with amount
    public static getSolanaAddressWithAmount(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        token: string | null,
        isDeposit: boolean
    ): [string, number] {
        //Parse All Addresses in Transaction
        let max_address = "";
        let max_delta = 0;

        if (token) {
            //Get mint address
            const mintAddress = sdkServer.sdk?.solana?.getMintAddress(token) || "";
            if (mintAddress === "") {
                console.log("Mint Address not found for token: " + token);
                return ["", 0];
            }

            //Parser all post balances
            for (let i = 0; i < (txn?.meta?.postTokenBalances?.length || 0); i++) {
                //Check mint address
                const postBalanceObj = txn?.meta?.postTokenBalances?.[i];
                if (postBalanceObj?.mint.toLocaleLowerCase() !== mintAddress.toLocaleLowerCase()) {
                    console.log(`Pre ${postBalanceObj?.mint} !== ${mintAddress}`);
                    continue;
                }

                const address = postBalanceObj?.owner || "";
                const preBalance = this.getPreBalance(txn, postBalanceObj);
                const postBalance = postBalanceObj?.uiTokenAmount.uiAmount;
                const delta = Number(Number(postBalance || 0) - Number(preBalance || 0));

                if (isDeposit && delta < 0) {
                    if (delta < max_delta) {
                        max_delta = delta;
                        max_address = address;
                    }
                } else if (!isDeposit && delta > 0) {
                    if (delta > max_delta) {
                        max_delta = delta;
                        max_address = address;
                    }
                }
            }
        } else {
            for (let i = 0; i < txn?.transaction?.message?.accountKeys.length; i++) {
                //Get Address
                const address = txn?.transaction?.message?.accountKeys[i]?.toString();
                if (!address) continue;

                let delta = Number(0);
                let preBalance: number | null | undefined = 0;
                let postBalance: number | null | undefined = 0;

                //Check Sol delta
                preBalance = txn?.meta?.preBalances[i];
                postBalance = txn?.meta?.postBalances[i];
                delta = Number(postBalance || 0) - Number(preBalance || 0);

                if (isDeposit && delta < 0) {
                    //Check if max delta
                    if (delta < max_delta) {
                        max_delta = delta;
                        max_address = address;
                    }
                } else if (!isDeposit && delta > 0) {
                    //Check if max delta
                    if (delta > max_delta) {
                        max_delta = delta;
                        max_address = address;
                    }
                }
            }
        }

        return [max_address, max_delta];
    }

    //Match a prebalance to a post balance object
    public static getPreBalance(txn: ParsedTransactionWithMeta, postBalance: TokenBalance | undefined) {
        if (!postBalance) {
            return 0;
        }

        for (let i = 0; i < (txn?.meta?.preTokenBalances?.length || 0); i++) {
            if (txn?.meta?.preTokenBalances?.[i].mint.toLocaleLowerCase() !== postBalance?.mint.toLocaleLowerCase()) {
                continue;
            }
            if (
                txn?.meta?.preTokenBalances?.[i].owner?.toLocaleLowerCase() !== postBalance?.owner?.toLocaleLowerCase()
            ) {
                continue;
            }
            return txn?.meta?.preTokenBalances?.[i].uiTokenAmount.uiAmount;
        }
    }
}
