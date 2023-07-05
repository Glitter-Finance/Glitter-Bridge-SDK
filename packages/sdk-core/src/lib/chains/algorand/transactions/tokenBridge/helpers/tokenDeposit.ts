import algosdk from "algosdk";

export enum AlgorandTokenBridgeDepositTransactions {
  deposit_xsol = "xSOL-deposit",
  deposit_algo = "algo-deposit",
}

/**
 * Builds the deposit parameters for the Algorand Token Bridge V1 Transactions
 * 
 * @param {AlgorandTokenBridgeDepositTransactions} method: the method call (deposit_xsol) or (deposit_algo)
 * @param {string} sourceAddress: the address on algorand making the deposit
 * @param {string} destinationAddress: the address on destination chain to receive the funds
 * @param {bigint} amount: The amount in microAlgo.
 * @param {string} txnSignature: Transaction signature.  Can be left blank for deposits
 * @returns {Uint8Array[]}: Builds the deposit params for Glitter Bridge v1 deposits
 */
export const buildDepositParams = (
    method: AlgorandTokenBridgeDepositTransactions,
    sourceAddress: string,
    destinationAddress: string,
    amount: bigint,
    txnSignature?: string
): Uint8Array[] => {
    const args: Uint8Array[] = [];
    /**
     * Transaction arguments:
     * 1. Destination Address
     * 2. Source Address
     * 3. Asset Account/ID
     * On XSOL deposit => solana_asset is "sol" and app_asset_type is "xSOL"
     * On algo deposit => solana_asset is "xALGoH1zUfRmpCriy94qbfoMXHtK6NDnMKzT4Xdvgms" and app_asset_type is "algo"
     * 4. Asset Symbol
     * 5. Method identifier
     * 6. Optional Signature
     * 7. Amount (BigInt)
     */
    args.push(new Uint8Array(Buffer.from(destinationAddress)));
    args.push(new Uint8Array(Buffer.from(sourceAddress)));
    args.push(
        new Uint8Array(
            Buffer.from(
                method === AlgorandTokenBridgeDepositTransactions.deposit_algo ?
                    "xALGoH1zUfRmpCriy94qbfoMXHtK6NDnMKzT4Xdvgms" : "sol"
            )
        )
    );
    args.push(
        new Uint8Array(
            Buffer.from(
                method === AlgorandTokenBridgeDepositTransactions.deposit_algo ?
                    "algo" : "xSOL"
            )
        )
    );
    args.push(new Uint8Array(Buffer.from(method.toString())));
    /**
     * TODO: figure out why txnSignature is added here,
     * since it is a deposit, which means no
     * txnSignature except of the deposit tx itself
     * Note from Andrew: The app args are common between deposit/refund/release, so this is just skipped inside the contract check
     */
    args.push(new Uint8Array(Buffer.from(txnSignature ?? "")));
    args.push(algosdk.encodeUint64(amount));

    return args;
};
