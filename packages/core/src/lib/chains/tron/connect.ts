import { PublicKey } from "@solana/web3.js";
import { BigNumber, ethers } from "ethers";
import { BridgeNetworks } from "../../common/networks/networks";
import { BridgeDepositEvent, BridgeReleaseEvent, TransferEvent } from "../evm";
import { TronConfig } from "./types";
import { decodeEventData, getLogByEventSignature, hexToBytes } from "./utils";
import { walletToAddress } from "../../common/utils/utils";
import Trc20DetailedAbi from "./abi/TRC20Detailed.json";
import TokenBridgeAbi from "./abi/TokenBridge.json";
import algosdk from "algosdk";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TronWeb = require("tronweb");

export class TronConnect {
    protected __tronConfig: TronConfig;
    protected __tronWeb: any;
    protected __usdc: any;
    protected __bridge: any;

    constructor(tronconfig: TronConfig) {
        this.__tronConfig = tronconfig;
        this.__tronWeb = new TronWeb(tronconfig.fullNode, tronconfig.solidityNode, tronconfig.eventServer);
        // https://github.com/tronprotocol/tronweb/issues/90
        this.__tronWeb.setAddress(this.tronConfig.addresses.releaseWallet);
        this.initContracts();
    }

    private async initContracts(): Promise<void> {
        const usdcConf = this.__tronConfig.tokens.find((x) => x.symbol.toLowerCase() === "usdc");

        if (usdcConf) {
            this.__usdc = await this.getContractAt(this.fromTronAddress(usdcConf.address), Trc20DetailedAbi.abi);
        }

        this.__bridge = await this.getContractAt(
            this.fromTronAddress(this.__tronConfig.addresses.bridge),
            TokenBridgeAbi.abi
        );
    }

    private async getContractAt(address: string, abi: any) {
        const contract = await this.__tronWeb.contract(abi, address);
        return contract;
    }
    private fromTronAddress(address: string): string {
        return TronWeb.address.toHex(address);
    }
    /**
     * Provide address of bridge
     * component
     * @param {"tokens" | "bridge" | "depositWallet" | "releaseWallet"} entity
     * @param {"USDC"} tokenSymbol only USDC for now
     * @returns {string}
     */
    getAddress(entity: "tokens" | "bridge" | "depositWallet" | "releaseWallet", tokenSymbol?: string): string {
        if (entity === "tokens") {
            if (!tokenSymbol) throw new Error("[EvmConnect] Please provide token symbol.");

            const token = this.__tronConfig.tokens.find(
                (local_token) => local_token.symbol.toLowerCase() === tokenSymbol.toLowerCase()
            );

            if (!token) {
                throw new Error("[EvmConnect] Can not provide address of undefined token.");
            }

            return this.fromTronAddress(token.address).toLowerCase();
        }

        return this.fromTronAddress(this.__tronConfig.addresses[entity]).toLowerCase();
    }
    private isValidToken(tokenSymbol: string): boolean {
        return !!this.__tronConfig.tokens.find((x) => x.symbol.toLowerCase() === tokenSymbol.toLowerCase());
    }
    /**
     * Provide token balance of an address
     * on the connected evm network
     * @param {"USDC"} tokenSymbol only USDC for now
     * @param {string} address
     * @returns {ethers.BigNumber}
     */
    async getTokenBalanceOnNetwork(tokenSymbol: string, address: string): Promise<BigNumber> {
        if (!this.isValidToken(tokenSymbol)) return Promise.reject("[EvmConnect] Unsupported token symbol.");

        const token = await this.getContractAt(this.getAddress("tokens", tokenSymbol), Trc20DetailedAbi.abi);
        const balance = await token.balanceOf(this.fromTronAddress(address)).call();
        return ethers.BigNumber.from(balance.toString());
    }
    /**
     * Bridge tokens to another supported chain
     * @param {BridgeNetworks} destination
     * @param {"USDC"} tokenSymbol only USDC for now
     * @param {string | ethers.BigNumber} amount in BigNumber units e.g 1_000_000 for 1USDC
     * @param {string | PublicKey | algosdk.Account} destinationWallet provide USDC reciever address on destination chain
     * @param {string} string source wallet
     * @param {privateKey} string to sign transaction
     * @returns {Promise<ethers.ContractTransaction>}
     */
    async bridge(
        destination: BridgeNetworks,
        tokenSymbol: string,
        amount: ethers.BigNumber | string,
        destinationWallet: string | PublicKey | algosdk.Account,
        sourceWallet: string,
        privateKey: string
    ): Promise<string> {
        try {
            if (!this.__tronWeb) {
                throw new Error(`[TronConnect] Sdk uninitialized.`);
            }

            if (!this.isValidToken(tokenSymbol)) {
                throw new Error(`[TronConnect] Unsupported token symbol.`);
            }

            const trWeb = new TronWeb(
                this.__tronConfig.fullNode,
                this.__tronConfig.solidityNode,
                this.__tronConfig.eventServer,
                privateKey
            );

            const tokenAddress = this.getAddress("tokens", tokenSymbol);
            const depositAddress = this.getAddress("depositWallet");

            const trc20Params = [
                { type: "address", value: TronWeb.address.fromHex(depositAddress) },
                { type: "uint256", value: amount.toString() },
            ];

            const destinationInStr: string = walletToAddress(destinationWallet);
            const transfer = {
                destination: {
                    chain: destination.toString(),
                    address: destinationInStr,
                },
                amount: amount.toString(),
            };

            const data = JSON.stringify(transfer);

            let txn = await trWeb.transactionBuilder.triggerSmartContract(
                tokenAddress,
                "transfer(address,uint256)",
                {},
                trc20Params,
                sourceWallet
            );

            txn = await trWeb.transactionBuilder.addUpdateData(txn.transaction, data, "utf8");

            const signedtxn = await trWeb.trx.sign(txn, privateKey);
            await trWeb.trx.sendRawTransaction(signedtxn);

            return signedtxn.txID;
        } catch (error) {
            return Promise.reject(error);
        }
    }
    /**
     * Bridge tokens to another supported chain
     * @param {BridgeNetworks} destination
     * @param {"USDC"} tokenSymbol only USDC for now
     * @param {string | ethers.BigNumber} amount in BigNumber units e.g 1_000_000 for 1USDC
     * @param {string | PublicKey | algosdk.Account} destinationWallet provide USDC reciever address on destination chain
     * @param {ethers.Wallet} wallet to sign transaction
     * @returns {Promise<ethers.ContractTransaction>}
     */
    async bridgeWeb(
        destination: BridgeNetworks,
        tokenSymbol: string,
        amount: ethers.BigNumber | string,
        destinationWallet: string | PublicKey | algosdk.Account,
        sourceWallet: string,
        trWeb: any
    ): Promise<string> {
        try {
            if (!this.__tronWeb) {
                throw new Error(`[TronConnect] Sdk uninitialized.`);
            }

            if (!this.isValidToken(tokenSymbol)) {
                throw new Error(`[TronConnect] Unsupported token symbol.`);
            }

            const tokenAddress = this.getAddress("tokens", tokenSymbol);
            const depositAddress = this.getAddress("depositWallet");

            const trc20Params = [
                { type: "address", value: TronWeb.address.fromHex(depositAddress) },
                { type: "uint256", value: amount.toString() },
            ];

            const destinationInStr: string = walletToAddress(destinationWallet);
            const transfer = {
                destination: {
                    chain: destination.toString(),
                    address: destinationInStr,
                },
                amount: amount.toString(),
            };

            const data = JSON.stringify(transfer);

            let txn = await trWeb.transactionBuilder.triggerSmartContract(
                tokenAddress,
                "transfer(address,uint256)",
                {},
                trc20Params,
                sourceWallet
            );

            txn = await trWeb.transactionBuilder.addUpdateData(txn.transaction, data, "utf8");

            const signedtxn = await trWeb.trx.sign(txn);
            await trWeb.trx.sendRawTransaction(signedtxn);

            return signedtxn.txID;
        } catch (error) {
            return Promise.reject(error);
        }
    }
    async deSerializeDepositEvent(depositTxHash: string): Promise<{
        destination: {
            chain: BridgeNetworks;
            address: string;
        };
        amount: string;
    } | null> {
        const tx = await this.__tronWeb.trx.getTransaction(depositTxHash);
        if (!("raw_data" in tx) || !("data" in tx.raw_data)) {
            return null;
        }

        const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(hexToBytes(tx.raw_data.data))));

        return decoded;
    }

    async getBridgeLogs(
        depositOrReleaseTxId: string
    ): Promise<Array<TransferEvent | BridgeDepositEvent | BridgeReleaseEvent>> {
        const events: Array<TransferEvent | BridgeDepositEvent | BridgeReleaseEvent> = [];
        const txInfo = await this.__tronWeb.trx.getTransactionInfo(depositOrReleaseTxId);
        let releaseMatch: any = null;
        let transferMatch: any = null;

        if (!("log" in txInfo)) {
            return [];
        }

        for (const log of txInfo.log) {
            try {
                const r = getLogByEventSignature(this.__tronWeb, [log], "BridgeRelease");
                const t = getLogByEventSignature(this.__tronWeb, [log], "Transfer");

                if (r) {
                    releaseMatch = r;
                }

                if (t) {
                    transferMatch = t;
                }
            } catch (error) {
                console.error("[TronConnect] Error: " + error);
            }
        }

        if (releaseMatch) {
            const decodedRelease = decodeEventData(releaseMatch, "BridgeRelease");

            if (decodedRelease) events.push(decodedRelease);
        }

        if (transferMatch) {
            const decodedTransfer = decodeEventData(transferMatch, "Transfer");

            if (decodedTransfer) events.push(decodedTransfer);
        }

        return events;
    }

    get tronWeb() {
        return this.__tronWeb;
    }

    get tronConfig() {
        return this.__tronConfig;
    }

    public get usdcBridgeDepositAddress(): string | number | undefined {
        return this.__tronConfig?.addresses.depositWallet;
    }
    public get usdcBridgeReceiverAddress(): string | number | undefined {
        return this.__tronConfig?.addresses.releaseWallet;
    }

    public getTxnHashed(txnID: string): string {
        return ethers.utils.keccak256(`0x${txnID}`);
    }
}
