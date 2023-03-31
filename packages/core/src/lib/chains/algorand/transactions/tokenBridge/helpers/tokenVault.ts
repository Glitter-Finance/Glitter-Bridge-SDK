import algosdk from "algosdk";
import {AlgorandStandardAssetConfig} from "src/lib/common";
import {BridgeNetworks} from "src/lib/common/networks/networks";

export enum AlgorandTokenBridgeVaultConfigTransactions {
  setup = "token_vault_setup",
  update_fee = "token_vault_update_fee",
  update_limits = "token_vault_update_limits",
  optin = "token_vault_optin",
}

export enum AlgorandTokenBridgeVaultTokenTransactions {
  deposit = "token_vault_deposit",
  release = "token_vault_release",
  refund = "token_vault_refund",
}

/**
 *
 * @param method
 * @param bridgeTokenConfig
 * @returns
 */
export const buildTokenVaultConfigTransactionParams = (
    method: AlgorandTokenBridgeVaultConfigTransactions,
    tokenConfig: AlgorandStandardAssetConfig
): Uint8Array[] => {
    if (!tokenConfig.feeDivisor) throw new Error("Fee Divisor is undefined");

    const args: Uint8Array[] = [];
    args.push(new Uint8Array(Buffer.from(method.toString())));
    args.push(algosdk.encodeUint64(tokenConfig.assetId));
    args.push(new Uint8Array(Buffer.from(tokenConfig.symbol)));
    args.push(algosdk.encodeUint64(tokenConfig.decimals));
    args.push(algosdk.encodeUint64(tokenConfig.feeDivisor));

    const minTransfer = tokenConfig.minTransfer ?? 0;
    args.push(
        algosdk.encodeUint64(minTransfer * Math.pow(10, tokenConfig.decimals))
    );
    const maxTransfer = tokenConfig.maxTransfer ?? 0;
    args.push(
        algosdk.encodeUint64(maxTransfer * Math.pow(10, tokenConfig.decimals))
    );

    return args;
};

/**
 *
 * @param method
 * @param sourceNetwork
 * @param destinationNetwork
 * @param sourceAddress
 * @param destinationAddress
 * @param amount
 * @param fromTxnSignature
 * @returns
 */
export const buildTokenVaultTokenTransactionParams = (
    method: AlgorandTokenBridgeVaultTokenTransactions,
    sourceNetwork: BridgeNetworks,
    destinationNetwork: BridgeNetworks,
    sourceAddress: string,
    destinationAddress: string,
    amount: bigint,
    fromTxnSignature?: string
): Uint8Array[] => {
    const args: Uint8Array[] = [];

    let fromSignature = "null";
    if (fromTxnSignature) fromSignature = fromTxnSignature;

    const sourcePublicKey =
    sourceNetwork === BridgeNetworks.algorand
        ? algosdk.decodeAddress(sourceAddress).publicKey
        : new Uint8Array();

    const destinationPublicKey =
    destinationAddress === BridgeNetworks.algorand
        ? algosdk.decodeAddress(destinationAddress).publicKey
        : new Uint8Array();

    args.push(new Uint8Array(Buffer.from(method)));
    args.push(
        new Uint8Array(Buffer.from(sourceNetwork.toString().toLowerCase()))
    );
    args.push(new Uint8Array(Buffer.from(sourceAddress)));
    args.push(sourcePublicKey);
    args.push(new Uint8Array(Buffer.from(fromSignature)));
    args.push(
        new Uint8Array(Buffer.from(destinationNetwork.toString().toLowerCase()))
    );
    args.push(new Uint8Array(Buffer.from(destinationAddress)));
    args.push(destinationPublicKey);
    args.push(algosdk.encodeUint64(amount));

    return args;
};
