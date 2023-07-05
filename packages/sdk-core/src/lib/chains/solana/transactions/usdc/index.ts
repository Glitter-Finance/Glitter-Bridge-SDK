import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { BridgeNetworks, BridgeTokenConfig, Routing } from "../../../../common";
import { SolanaAccountsConfig } from "../../types";
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import BigNumber from "bignumber.js";

/**
 * Bridges USDC tokens from the source network to the destination network.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {string} sourceAddress - The source address from which to bridge the tokens.
 * @param {string} destinationAddress - The destination address to receive the bridged tokens.
 * @param {BridgeNetworks} destinationNetwork - The destination network to bridge the tokens to.
 * @param {BigNumber} amount - The amount of USDC tokens to bridge.
 * @param {SolanaAccountsConfig} solanaAccountsConfig - The Solana accounts configuration.
 * @param {BridgeTokenConfig} usdcConfig - The configuration for the USDC token.
 * @returns {Promise<Transaction>} - A Promise that resolves when the bridging operation is completed.
 */
export async function bridgeUSDC (
    connection: Connection,
    sourceAddress: string,
    destinationAddress: string,
    destinationNetwork: BridgeNetworks,
    amount: BigNumber,
    solanaAccountsConfig: SolanaAccountsConfig,
    usdcConfig: BridgeTokenConfig
) {
    if (usdcConfig.symbol !== "USDC") return Promise.reject(new Error(
        'Expected USDC token configugration'
    ))

    const routingInfo: Routing = {
        from: {
            token: usdcConfig.symbol,
            network: BridgeNetworks.solana.toString().toLowerCase(),
            address: sourceAddress,
            txn_signature: "",
        },
        to: {
            token: usdcConfig.symbol,
            network: destinationNetwork.toString().toLowerCase(),
            address: destinationAddress,
            txn_signature: "",
        },
        amount: amount.div(10 ** usdcConfig.decimals),
        units: amount,
    };

    const bridgeNodeInstructionData = {
        system: routingInfo,
        date: new Date().toISOString(),
    };

    const sourcePublicKey = new PublicKey(sourceAddress);
    const usdcMint = await getMint(connection, new PublicKey(usdcConfig.address));
    const destinationPubkey = new PublicKey(solanaAccountsConfig.usdcDeposit);
    const fromTokenAccount = await getAssociatedTokenAddress(usdcMint.address, sourcePublicKey);
    const tx = new Transaction();
    const tokenAccountInfo = await connection.getAccountInfo(fromTokenAccount);

    if (!fromTokenAccount) {
        return Promise.reject(new Error("fromTokenAccount does not exist"))
    }

    if (!tokenAccountInfo) {
        return Promise.reject(new Error('Account does not own a USDC token account'))
    }
    
    tx.add(
        createTransferInstruction(
            fromTokenAccount,
            destinationPubkey,
            sourcePublicKey,
            amount.toNumber(),
            [],
            TOKEN_PROGRAM_ID
        )
    );
    tx.add(
        new TransactionInstruction({
            keys: [{ pubkey: sourcePublicKey, isSigner: true, isWritable: true }],
            data: Buffer.from(JSON.stringify(bridgeNodeInstructionData), "utf-8"),
            programId: new PublicKey(solanaAccountsConfig.memoProgram),
        })
    );

    return tx;
}