import { PublicKey } from "@solana/web3.js";
import { BigNumber, ethers } from "ethers";
import { BridgeNetworks } from "../../common/networks";
import { BridgeDepositEvent, BridgeReleaseEvent, TransferEvent } from "../evm";
import { TronConfig } from "./types";
import { decodeEventData, getLogByEventSignature, hexToBytes } from "./utils";
import { walletToAddress } from "../../common/utils/utils";
import Trc20DetailedAbi from "./abi/TRC20Detailed.json";
import TokenBridgeAbi from "./abi/TokenBridge.json";
import algosdk from "algosdk";
import { BridgeTokenConfig, BridgeTokens } from "../../";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TronWeb = require("tronweb");

/**
 * Represents a connection to the Tron network.
 *
 * @class TronConnect
 */
export class TronConnect {
    protected __tronConfig: TronConfig;
    protected __tronWeb: any;
    protected __usdc: any;
    protected __bridge: any;

    /**
     * Creates an instance of the TronConnect class.
     *
     * @constructor
     * @param {TronConfig} tronconfig - The configuration for the Tron connection.
     */
    constructor(tronconfig: TronConfig) {
        this.__tronConfig = tronconfig;
        this.__tronWeb = new TronWeb(
            tronconfig.fullNode,
            tronconfig.solidityNode,
            tronconfig.eventServer
        );
        // https://github.com/tronprotocol/tronweb/issues/90
        this.__tronWeb.setAddress(this.tronConfig.addresses.releaseWallet);
        BridgeTokens.loadConfig(BridgeNetworks.TRON, this.__tronConfig.tokens);
        this.initContracts();
    }

    /**
     * Sets the API key to be used for the Tron connection.
     *
     * @method setApiKey
     * @param {string} apiKey - The API key to be set.
     * @returns {void}
     */
    public setApiKey(apiKey: string) {
        this.__tronWeb.setHeader({ "TRON-PRO-API-KEY": apiKey });
    }

    private async initContracts(): Promise<void> {
        const usdcConf = this.__tronConfig.tokens.find(
            (x) => x.symbol.toLowerCase() === "usdc"
        );

        if (usdcConf) {
            this.__usdc = await this.getContractAt(
                this.fromTronAddress(usdcConf.address),
                Trc20DetailedAbi.abi
            );
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
     * Retrieves the address associated with a specific entity.
     *
     * @method getAddress
     * @param {"tokens" | "bridge" | "depositWallet" | "releaseWallet"} entity - The entity for which to retrieve the address.
     * @param {string} [tokenSymbol] - The symbol of the token associated with the address (optional).
     * @returns {string} - The address associated with the specified entity.
     */
    getAddress(
        entity: "tokens" | "bridge" | "depositWallet" | "releaseWallet",
        tokenSymbol?: string
    ): string {
        if (entity === "tokens") {
            if (!tokenSymbol)
                throw new Error("[EvmConnect] Please provide token symbol.");

            const token = this.__tronConfig.tokens.find(
                (local_token) =>
                    local_token.symbol.toLowerCase() === tokenSymbol.toLowerCase()
            );

            if (!token) {
                throw new Error(
                    "[EvmConnect] Can not provide address of undefined token."
                );
            }

            return this.fromTronAddress(token.address).toLowerCase();
        }

        return this.fromTronAddress(
            this.__tronConfig.addresses[entity]
        ).toLowerCase();
    }

    //New Get Addresses
    /**
     * Provide address of bridge entity
     * @param {"tokens" | "bridge" | "depositWallet" | "releaseWallet"} entity the bridge entity to get address of
     * @param {"USDC"} tokenSymbol only USDC for now
     * @returns {string} The hex address of the requested address entity
     */
    getHexAddress(
        entity: "tokens" | "bridge" | "depositWallet" | "releaseWallet",
        tokenSymbol?: string
    ): string {    
        return this.fromTronAddress(this.getTronAddress(entity, tokenSymbol)).toLowerCase();
    }

    /**
     * Provide address of bridge entity
     * @param {"tokens" | "bridge" | "depositWallet" | "releaseWallet"} entity the bridge entity to get address of
     * @param {"USDC"} tokenSymbol only USDC for now
     * @returns {string} The hex address of the requested address entity
     */
    getTronAddress(
        entity: "tokens" | "bridge" | "depositWallet" | "releaseWallet",
        tokenSymbol?: string
    ): string {
        if (entity === "tokens") {
            if (!tokenSymbol)
                throw new Error("[EvmConnect] Please provide token symbol.");

            const token = this.__tronConfig.tokens.find(
                (local_token) =>
                    local_token.symbol.toLowerCase() === tokenSymbol.toLowerCase()
            );

            if (!token) {
                throw new Error(
                    "[EvmConnect] Can not provide address of undefined token."
                );
            }

            return token.address;
        }

        return this.__tronConfig.addresses[entity];
        
    }

    /**
     * Checks if a token symbol is valid.
     *
     * @method isValidToken
     * @param {string} tokenSymbol - The token symbol to check.
     * @returns {boolean} - A boolean indicating whether the token symbol is valid.
     */
    private isValidToken(tokenSymbol: string): boolean {
        return !!this.__tronConfig.tokens.find(
            (x) => x.symbol.toLowerCase() === tokenSymbol.toLowerCase()
        );
    }

    /**
     * Retrieves the token balance of a specific address on the network.
     *
     * @method getTokenBalanceOnNetwork
     * @async
     * @param {string} tokenSymbol - The symbol of the token for which to retrieve the balance.
     * @param {string} address - The address for which to retrieve the token balance.
     * @returns {Promise<BigNumber>} - A Promise that resolves to the token balance as a BigNumber.
     */
    async getTokenBalanceOnNetwork(
        tokenSymbol: string,
        address: string
    ): Promise<BigNumber> {
        if (!this.isValidToken(tokenSymbol))
            return Promise.reject("[EvmConnect] Unsupported token symbol.");

        const token = await this.getContractAt(
            this.getAddress("tokens", tokenSymbol),
            Trc20DetailedAbi.abi
        );
        const balance = await token.balanceOf(this.fromTronAddress(address)).call();
        return ethers.BigNumber.from(balance.toString());
    }

    /**
     * Bridges a specific token from the source wallet to the destination wallet on the specified network.
     *
     * @method bridge
     * @async
     * @param {string} sourceWallet - The source wallet from which to bridge the token.
     * @param {string | PublicKey | algosdk.Account} destinationWallet - The destination wallet or account to receive the bridged token.
     * @param {BridgeNetworks} destination - The destination network for the bridged token.
     * @param {string} tokenSymbol - The symbol of the token to bridge.
     * @param {ethers.BigNumber | string} amount - The amount of the token to bridge.
     * @param {string} privateKey - The private key of the source wallet.
     * @returns {Promise<string>} - A Promise that resolves to the transaction hash or identifier for the bridge transaction.
     */
    async bridge(
        sourceWallet: string,
        destinationWallet: string | PublicKey | algosdk.Account,
        destination: BridgeNetworks,
        tokenSymbol: string,
        amount: ethers.BigNumber | string,
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

            txn = await trWeb.transactionBuilder.addUpdateData(
                txn.transaction,
                data,
                "utf8"
            );

            const signedtxn = await trWeb.trx.sign(txn, privateKey);
            await trWeb.trx.sendRawTransaction(signedtxn);

            return signedtxn.txID;
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Bridges a specific token from the source wallet to the destination wallet on the specified network using a web interface.
     *
     * @method bridgeWeb
     * @async
     * @param {BridgeNetworks} destination - The destination network for the bridged token.
     * @param {string} tokenSymbol - The symbol of the token to bridge.
     * @param {ethers.BigNumber | string} amount - The amount of the token to bridge.
     * @param {string | PublicKey | algosdk.Account} destinationWallet - The destination wallet or account to receive the bridged token.
     * @param {string} sourceWallet - The source wallet from which to bridge the token.
     * @param {any} trWeb - The web interface for interacting with the bridge.
     * @returns {Promise<string>} - A Promise that resolves to the transaction hash or identifier for the bridge transaction.
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

            txn = await trWeb.transactionBuilder.addUpdateData(
                txn.transaction,
                data,
                "utf8"
            );

            const signedtxn = await trWeb.trx.sign(txn);
            await trWeb.trx.sendRawTransaction(signedtxn);

            return signedtxn.txID;
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Deserializes the deposit event data based on the deposit transaction hash.
     *
     * @method deSerializeDepositEvent
     * @async
     * @param {string} depositTxHash - The deposit transaction hash.
     * @returns {Promise<Object>} - A Promise that resolves to an object containing the deserialized deposit event data.
     */
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

        const decoded = JSON.parse(
            new TextDecoder().decode(Uint8Array.from(hexToBytes(tx.raw_data.data)))
        );

        return decoded;
    }

    /**
     * Retrieves the bridge logs associated with a specific deposit or release transaction ID.
     *
     * @method getBridgeLogs
     * @async
     * @param {string} depositOrReleaseTxId - The transaction ID of the deposit or release.
     * @returns {Promise<Array<TransferEvent | BridgeDepositEvent | BridgeReleaseEvent>>} - A Promise that resolves to an array of bridge logs, which can be TransferEvent, BridgeDepositEvent, or BridgeReleaseEvent objects.
     */
    async getBridgeLogs(
        depositOrReleaseTxId: string
    ): Promise<Array<TransferEvent | BridgeDepositEvent | BridgeReleaseEvent>> {
        const events: Array<
      TransferEvent | BridgeDepositEvent | BridgeReleaseEvent
    > = [];
        const txInfo = await this.__tronWeb.trx.getTransactionInfo(
            depositOrReleaseTxId
        );
        let releaseMatch: any = null;
        let transferMatch: any = null;

        if (!("log" in txInfo)) {
            return [];
        }

        for (const log of txInfo.log) {
            try {
                const r = getLogByEventSignature(
                    this.__tronWeb,
                    [log],
                    "BridgeRelease"
                );
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

    /**
     * Retrieves the TronWeb instance.
     *
     * @method tronWeb
     * @returns {TronWeb} - The TronWeb instance.
     */
    get tronWeb() {
        return this.__tronWeb;
    }

    /**
     * Retrieves the Tron configuration.
     *
     * @method tronConfig
     * @returns {TronConfig} - The Tron configuration.
     */
    get tronConfig() {
        return this.__tronConfig;
    }

    /**
     * Retrieves the hashed transaction ID.
     *
     * @method getTxnHashed
     * @param {string} txnID - The transaction ID.
     * @returns {string} - The hashed transaction ID.
     */
    public getTxnHashed(txnID: string): string {
        return ethers.utils.keccak256(`0x${txnID}`);
    }

    /**
     * Retrieves the configuration for a specific token based on its symbol.
     *
     * @method getToken
     * @param {string} tokenSymbol - The symbol of the token.
     * @returns {BridgeTokenConfig | undefined} - The configuration for the token, or undefined if the token is not found.
     */
    public getToken(tokenSymbol: string): BridgeTokenConfig | undefined {
        return this.__tronConfig.tokens.find(x => x.symbol.toLowerCase() === tokenSymbol.toLowerCase())
    }
}
