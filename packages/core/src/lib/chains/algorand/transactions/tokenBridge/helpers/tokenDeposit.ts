import algosdk from "algosdk";

export enum AlgorandTokenBridgeDepositTransactions {
  deposit_xsol = "xSOL-deposit",
  deposit_algo = "algo-deposit",
}

/**
 *
 * @param sourceNetwork
 * @param destinationNetwork
 * @param sourceAddress
 * @param destinationAddress
 * @param amount
 * @param tokenSymbol
 * @param txnSignature
 * @returns
 */
export const buildDepositParams = (
    sourceAddress: string,
    destinationAddress: string,
    amount: bigint,
    tokenSymbol: "xSOL" | "algo",
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
                tokenSymbol === "xSOL"
                    ? "sol"
                    : "xALGoH1zUfRmpCriy94qbfoMXHtK6NDnMKzT4Xdvgms"
            )
        )
    );
    args.push(new Uint8Array(Buffer.from(tokenSymbol)));
    args.push(
        new Uint8Array(
            Buffer.from(
                tokenSymbol === "xSOL"
                    ? AlgorandTokenBridgeDepositTransactions.deposit_xsol.toString()
                    : AlgorandTokenBridgeDepositTransactions.deposit_algo.toString()
            )
        )
    );
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
