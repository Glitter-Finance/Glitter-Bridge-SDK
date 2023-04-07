import {PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import {BridgeNetworks, BridgeTokens, Routing, RoutingHelper} from "../../../";

export async function sendSolTransaction(routing: Routing): Promise<Transaction> {
    if (!routing.amount) return Promise.reject(new Error("Invalid Routing information"));

    const solToken = BridgeTokens.getToken(BridgeNetworks.solana, "SOL")
    if (!solToken) return Promise.reject(new Error('Unable to find configuration for SOL token'));

    const txn = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: new PublicKey(routing.from.address),
            toPubkey: new PublicKey(routing.to.address),
            lamports: RoutingHelper.BaseUnits_FromReadableValue(routing.amount, solToken.decimals).toNumber(),
        })
    );

    return txn;
}