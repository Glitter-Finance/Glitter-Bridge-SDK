import {Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction} from "@solana/web3.js";
import {BridgeTokenConfig, Routing, RoutingHelper} from "src/lib/common";
import {SolanaAccountsConfig} from "../../types";
import {getSolEscrowAccount} from "./utils";
import algosdk from "algosdk";
import {serialize} from "borsh"
import {BridgeInitSchema} from "./schemas";

export async function solBridgeTransaction(
    connection: Connection,
    account: PublicKey,
    routing: Routing,
    token: BridgeTokenConfig,
    solanaAccountsConfig: SolanaAccountsConfig
): Promise<Transaction> {
    let destinationAddressSerialized: Uint8Array | undefined = undefined;1
    if (token.symbol.toLowerCase() != "sol") return Promise.reject(new Error("Token must be SOL"));
    if (!routing.amount) return Promise.reject(new Error("Routing amount should be provided"));
    const solanaEscrowAccount = await getSolEscrowAccount(solanaAccountsConfig, account);

    if (routing.to.network == "algorand") {
        destinationAddressSerialized = algosdk.decodeAddress(routing.to.address).publicKey;
    }

    if (!destinationAddressSerialized) return Promise.reject(new Error("to address is required.  Could not deserialize address"));

    const amount = RoutingHelper.BaseUnits_FromReadableValue(routing.amount, token.decimals);
    let data = serialize(
        BridgeInitSchema.init_schema,
        new BridgeInitSchema({
            algo_address: destinationAddressSerialized,
            amount: amount.toNumber(),
        })
    );

    data = new Uint8Array([10, ...data]);

    const instructions = new TransactionInstruction({
        programId: new PublicKey(solanaAccountsConfig.bridgeProgram),
        keys: [
            {pubkey: account, isSigner: true, isWritable: true},
            {pubkey: solanaEscrowAccount, isSigner: false, isWritable: true},
            {
                pubkey: new PublicKey("GdMte7MdNc3n6zFKZAmKa3TCBhPooPNJ3cBGnJc3uHnG"),
                isSigner: false,
                isWritable: false,
            },
            {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
        ],
        data: Buffer.from(data),
    });

    const latestBlockhash = await connection.getLatestBlockhash("finalized");
    const transaction = new Transaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    transaction.add(...[instructions]);
    return transaction;
}