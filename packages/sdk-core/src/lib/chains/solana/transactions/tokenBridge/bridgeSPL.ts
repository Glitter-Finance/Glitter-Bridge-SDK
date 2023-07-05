import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { SolanaAccountsConfig } from "../../types";
import { BridgeTokenConfig, Routing, RoutingHelper } from "../../../../common";
import { getSolEscrowAccount, getTokenAccount, getTokenEscrowAccount } from "./utils";
import algosdk from "algosdk";
import { serialize } from "borsh";
import { BridgeInitSchema } from "./schemas";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

/**
 * Builds a token bridge transaction.
 *
 * @param {Connection} connection - The connection object.
 * @param {PublicKey} account - The account public key.
 * @param {Routing} routing - The routing information.
 * @param {BridgeTokenConfig} token - The token configuration.
 * @param {SolanaAccountsConfig} solanaAccountsConfig - The Solana accounts configuration.
 * @returns {Promise<Transaction>} - A promise that resolves with the built token bridge transaction.
 */
export async function tokenBridgeTransaction(
    connection: Connection,
    account: PublicKey,
    routing: Routing,
    token: BridgeTokenConfig,
    solanaAccountsConfig: SolanaAccountsConfig
): Promise<Transaction> {
    if (token.symbol.toLowerCase() == "sol") return Promise.reject(new Error("Token must be SOL"));
    if (!token.address) return Promise.reject(new Error("mint address is required"));
    if (!routing.amount) return Promise.reject(new Error("amount is required"));

    const bridgeProgram = new PublicKey(solanaAccountsConfig.bridgeProgram);
    const solEscrowAccount = await getSolEscrowAccount(solanaAccountsConfig, account);
    const tokenEscrowAccount = await getTokenEscrowAccount(solanaAccountsConfig, account);
    const userTokenAccount = await getTokenAccount(account, new PublicKey(token.address));
    const mintToken = new PublicKey(token.address);

    let destinationAddressSerialized: Uint8Array | undefined = undefined;
    // should it even work other networks?
    // if so, input enforcement should
    // always expect it to be algorand 
    // hardcoding not good
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

    //Shift data
    data = new Uint8Array([20, ...data]);
    console.log(account.toBase58(), solEscrowAccount.toBase58());

    const instructions = new TransactionInstruction({
        programId: bridgeProgram,
        keys: [
            { pubkey: account, isSigner: true, isWritable: false },
            { pubkey: userTokenAccount, isSigner: false, isWritable: true },
            { pubkey: solEscrowAccount, isSigner: false, isWritable: true },
            { pubkey: tokenEscrowAccount, isSigner: false, isWritable: true },
            {
                // WHY IS THIS ADDRESS HARDCODED?
                pubkey: new PublicKey("2g1SsjER76eKTLsSCdpDyB726ba8SwvN23YMoknTHvmX"),
                isSigner: false,
                isWritable: false,
            },
            { pubkey: mintToken, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
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