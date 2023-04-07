import {createCloseAccountInstruction, createTransferCheckedInstruction} from "@solana/spl-token";
import {PublicKey, Transaction} from "@solana/web3.js";
import {BridgeTokenConfig, Routing, RoutingHelper} from "../../../common";

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
