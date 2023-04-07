import {Connection, PublicKey, Transaction, TransactionInstruction} from "@solana/web3.js";
import {BridgeNetworks, BridgeTokenConfig, Routing} from "../../../../common";
import {SolanaAccountsConfig} from "../../types";
import {TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, getMint} from "@solana/spl-token";
import BigNumber from "bignumber.js";

/**
 * 
 * @param connection 
 * @param sourceAddress 
 * @param destinationAddress 
 * @param destiantionNetwork 
 * @param amount 
 * @param solanaAccountsConfig 
 * @param usdcConfig 
 * @returns 
 */
export async function bridgeUSDC (
    connection: Connection,
    sourceAddress: string,
    destinationAddress: string,
    destiantionNetwork: BridgeNetworks,
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
            network: destiantionNetwork.toString().toLowerCase(),
            address: destinationAddress,
            txn_signature: "",
        },
        amount: amount.div(10 ** usdcConfig.decimals).toNumber(),
        units: amount.toString(),
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
            keys: [{pubkey: sourcePublicKey, isSigner: true, isWritable: true}],
            data: Buffer.from(JSON.stringify(bridgeNodeInstructionData), "utf-8"),
            programId: new PublicKey(solanaAccountsConfig.memoProgram),
        })
    );

    return tx;
}