import { PublicKey } from "@solana/web3.js";
import algosdk from "algosdk";
import { ethers, providers } from "ethers";
import {
    ERC20,
    ERC20__factory,
    TokenBridge,
    TokenBridge__factory,
} from "glitter-evm-contracts";
import {
    BridgeTokenConfig,
    BridgeTokens,
    BridgeV2Tokens,
    Token2ChainConfig
} from "../../../lib/common";
import { BridgeV2Abi__factory, Erc20Abi__factory } from "../../../typechain";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
    NetworkIdentifiers,
    getNumericNetworkId,
} from "../../common/networks";
import { ChainStatus } from "../../common/transactions";
import { addr_to_pk, walletToAddress } from "../../common/utils/utils";
import { EvmBridgeEventsParser } from "./events";
import { SerializeEvmBridgeTransfer } from "./serde";
import {
    BridgeDepositEvent,
    BridgeReleaseEvent,
    EvmNetworkConfig,
    TransferEvent,
} from "./types";

/**
 * Represents a connection object.
 * @typedef {Object} Connection
 * @property {providers.BaseProvider} rpcProvider - The RPC provider for the connection.
 * @property {TokenBridge} bridge - The bridge object for the connection.
 * @property {Map<string, ERC20>} tokens - A map of token symbols to ERC20 token objects.
 */
type Connection = {
    rpcProvider: providers.BaseProvider;
    bridge: TokenBridge;
    tokens: Map<string, ERC20>;
};

/**
 * Class representing the Evm connection.
 */
export class EvmConnect {
    protected readonly __network: BridgeEvmNetworks;
    protected readonly __providers: Connection;
    protected readonly __config: EvmNetworkConfig;

    /**
     * Creates connection objects based on the provided RPC URL and configuration.
     *
     * @private
     * @param {string} rpcUrl - The RPC URL for the connection.
     * @param {EvmNetworkConfig} config - The configuration object for the EVM network.
     * @param {Token2ChainConfig[]} [bridgeV2Tokens] - Tokens for bridgeV2 configuration.
     * @returns {Connection} - The created connection object.
     */
    private createConnections(
        rpcUrl: string,
        config: EvmNetworkConfig,
        bridgeV2Tokens?: Token2ChainConfig[]
    ): Connection {
        const bridgeAddress = config.bridge;
        const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const bridge = TokenBridge__factory.connect(
            bridgeAddress,
            rpcProvider
        );
        const tokens = new Map<string, ERC20>();
        if (bridgeV2Tokens) {
            bridgeV2Tokens.forEach((_token) => {
                const symbol = _token.symbol.toLowerCase();
                if (!_token.isNative) {
                    tokens.set(
                        symbol,
                        ERC20__factory.connect(
                            _token.address as string,
                            rpcProvider
                        )
                    );
                }
            });
        } else {
            config.tokens.forEach((_token) => {
                const symbol = _token.symbol.toLowerCase();
                tokens.set(
                    symbol,
                    ERC20__factory.connect(
                        _token.address as string,
                        rpcProvider
                    )
                );
            });
        }

        return {
            rpcProvider,
            bridge,
            tokens,
        };
    }

    /**
     * Create an instance of the class.
     *
     * @param {BridgeEvmNetworks} network - The network for the instance.
     * @param {EvmNetworkConfig} config - The configuration object for the EVM network.
     * @param {Token2ChainConfig} [bridgeV2Tokens] - The list of bridge V2 tokens (optional).
     */
    constructor(
        network: BridgeEvmNetworks,
        config: EvmNetworkConfig,
        bridgeV2Tokens?: Token2ChainConfig[]
    ) {
        this.__config = config;
        this.__network = network;
        BridgeTokens.loadConfig(this.__network, config.tokens);
        this.__providers = this.createConnections(
            config.rpcUrl,
            config,
            bridgeV2Tokens
        );
    }

    /**
     * Retrieves the base provider for the instance.
     *
     * @returns {ethers.providers.BaseProvider} - The base provider for the instance.
     */
    get provider(): ethers.providers.BaseProvider {
        return this.__providers.rpcProvider;
    }

    /**
     * Retrieves the EVM network configuration for the instance.
     *
     * @returns {EvmNetworkConfig} - The EVM network configuration for the instance.
     */
    get config(): EvmNetworkConfig {
        return this.__config;
    }

    /**
     * Retrieves the EVM network for the instance.
     *
     * @returns {BridgeEvmNetworks} - The EVM network for the instance.
     */
    get network(): BridgeEvmNetworks {
        return this.__network;
    }

    /**
     * Provide address of bridge component
     * 
     * @param {"tokens" | "bridge" | "depositWallet" | "releaseWallet"| "tokenBridge" | "circleTreasury"} entity The type of address to provide
     * @param {"USDC"} tokenSymbol only USDC for now
     * @returns {string} returns the address for the given entity
     */
    getAddress(
        entity: "tokens" | "bridge" | "depositWallet" | "releaseWallet" | "tokenBridge" | "circleTreasury",
        tokenSymbol?: string
    ): string {
        if (entity === "tokens") {
            if (!tokenSymbol)
                throw new Error("[EvmConnect] Please provide token symbol.");

            const token = this.isValidV2Token(tokenSymbol)
                ? this.getV2Token(tokenSymbol)
                : this.__config.tokens.find(
                    (local_token) =>
                        local_token.symbol.toLowerCase() === tokenSymbol.toLowerCase()
                );

            if (!token || !token.address || typeof token.address === "number") {
                throw new Error(
                    `[EvmConnect] Can not provide address of ${tokenSymbol} token.`
                );
            }

            return token.address.toLowerCase();
        }

        return this.__config[entity].toLowerCase();
    }

    /**
     * Checks if a token symbol is valid.
     *
     * @private
     * @param {string} tokenSymbol - The symbol of the token.
     * @returns {boolean} - Returns true if the token symbol is valid, otherwise false.
     */
    private isValidToken(tokenSymbol: string): boolean {
        return !!this.__providers.tokens.get(tokenSymbol.toLowerCase());
    }

    private isValidV2Token(tokenSymbol: string): boolean {
        return !!BridgeV2Tokens.getTokenConfigFromChildSymbol(tokenSymbol);
    }

    /**
     * Retrieves the token balance of a specified token symbol for a given address on the network.
     *
     * @param {string} address - The address for which to retrieve the token balance.
     * @param {string} tokenSymbol - The symbol of the token.
     * @returns {Promise<ethers.BigNumber>} - A promise that resolves with the token balance as an ethers.BigNumber.
     */
    async getV2Balance(
        address: string,
        tokenSymbol: string
    ): Promise<ethers.BigNumber> {
        const symbol = tokenSymbol.toLowerCase();
        const token = BridgeV2Tokens.getTokenConfigFromChildSymbol(symbol);
        if (!token) return Promise.reject("[EvmConnect] Could not locate token");
        const configChild = BridgeV2Tokens.getTokenConfigChild(
            token,
            this.__network
        );
        if (!configChild || !configChild.address || configChild.isNative) {
            // Fallback to native currency balance
            return ethers.providers.getDefaultProvider().getBalance(address);
        }

        return ERC20__factory.connect(configChild.address, this.provider).balanceOf(
            address
        );
    }

    async getTokenBalanceOnNetwork(
        tokenSymbol: string,
        address: string
    ): Promise<ethers.BigNumber> {
        const isValid =
            this.isValidToken(tokenSymbol) || this.isValidV2Token(tokenSymbol);
        if (!isValid)
            return Promise.reject("[EvmConnect] Unsupported token symbol.");

        if (this.isValidV2Token(tokenSymbol)) {
            return this.getV2Balance(address, tokenSymbol);
        }

        const symbol = tokenSymbol.toLowerCase();
        const erc20 = this.__providers.tokens.get(symbol);
        const balance = await erc20!.balanceOf(address);
        return balance;
    }

    /**
     * Approves tokens to be used by the v1 bridge.
     *
     * @param {string} tokenSymbol - The symbol of the token to approve.
     * @param {ethers.Signer} signer - The signer to use for the approval transaction.
     * @param {ethers.BigNumber | string} amount - The amount of tokens to approve.
     * @returns {Promise<ethers.ContractTransaction>} - A promise that resolves with the approval transaction.
     */
    async v1Approve(tokenSymbol: string, signer: ethers.Signer, amount: ethers.BigNumber | string): Promise<ethers.ContractTransaction> {
        // DO the v1 Approval
        const bridgeAddress = this.getAddress("bridge");
        const tokenAddress = this.getAddress("tokens", tokenSymbol);

        const token = ERC20__factory.connect(tokenAddress, signer);
        return await token.approve(bridgeAddress, amount);
    }

    /**
     * Approves tokens to be used by the bridge.
     *
     * @param {string} tokenSymbol - The symbol of the token to approve.
     * @param {ethers.BigNumber | string} amount - The amount of tokens to approve.
     * @param {ethers.Signer} signer - The signer to use for the approval transaction.
     * @returns {Promise<ethers.ContractTransaction>} - A promise that resolves with the approval transaction.
     */
    approveTokensForBridge(
        tokenSymbol: string,
        amount: ethers.BigNumber | string,
        signer: ethers.Signer
    ): Promise<ethers.ContractTransaction> {
        switch (true) {
            case this.isValidToken(tokenSymbol):
                return this.v1Approve(tokenSymbol, signer, amount);
            case this.isValidV2Token(tokenSymbol):
                return this.v2Approve({ tokenSymbol, amount, signer });
            default:
                throw new Error("[EvmConnect] Unsupported token symbol.");
        }
    }

    async v2Approve({ tokenSymbol, amount, signer }: { amount: ethers.BigNumber | string; tokenSymbol: string; signer: ethers.Signer }) {
        const chainToken = this.getV2Token(tokenSymbol);
        if (!chainToken) return Promise.reject("[EvmConnect] Unknown chainToken.");
        const { vault_type, vault_address, address } = chainToken
        if (!vault_type || !vault_address || !address)
            throw new Error("missing token config");

        // estimate gas price
        const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } =
            await this.provider.getFeeData();
        if (!gasPrice) {
            throw new Error("cannot estimate gas costs");
        }
        console.log(
            `Current gas price is ${gasPrice.div(10 ** 9).toString()} gwei`
        );
        console.log(
            `Current maxFeePerGas is ${maxFeePerGas?.div(10 ** 9).toString()} gwei`
        );
        console.log(
            `Current maxPriorityFeePerGas is ${maxPriorityFeePerGas
                ?.div(10 ** 9)
                .toString()} gwei`
        );

        if (vault_type !== "outgoing" && vault_type !== "incoming") throw new Error("invalid vault type");
        // outgoing vaults are a wrapper of erc20 tokens
        // For spending tokens, they need to get approved as a spender of the amount of token from the user account.
        console.log("Approving vault as a token spender");
        const erc20Contract = Erc20Abi__factory.connect(address, signer);
        if (
            this.network == BridgeNetworks.Polygon ||
            !maxFeePerGas ||
            !maxPriorityFeePerGas
        ) {
            return await erc20Contract.approve(vault_address, amount, {
                gasPrice,
            });
        } else {
            return await erc20Contract.approve(vault_address, amount, {
                maxFeePerGas,
                maxPriorityFeePerGas,
            });
        }
    }

    /**
     * Returns allowance value for a specified token.
     * @param tokenSymbol {string} - The symbol of the token.
     * @param signer {ethers.Signer} - The signer to use for the operation.
     * @returns 
     */
    async getV1Allowance(tokenSymbol: string, signer: ethers.Signer): Promise<ethers.BigNumber> {
        // V1 Allowance
        const tokenAddress = this.getAddress("tokens", tokenSymbol);
        const usdc = ERC20__factory.connect(tokenAddress, signer);

        const allowance = await usdc.allowance(
            signer.getAddress(),
            this.getAddress("bridge", tokenSymbol)
        );

        return allowance;
    }

    /**
     * Retrieves the current allowance of tokens for the bridge.
     *
     * @param {string} tokenSymbol - The symbol of the token.
     * @param {ethers.Signer} signer - The signer to use for the operation.
     * @returns {Promise<ethers.BigNumber>} - A promise that resolves with the current token allowance for the bridge.
     */
    async bridgeAllowance(
        tokenSymbol: string,
        signer: ethers.Signer
    ): Promise<ethers.BigNumber> {
        switch (true) {
            case this.isValidToken(tokenSymbol):
                return this.getV1Allowance(tokenSymbol, signer);
            case this.isValidV2Token(tokenSymbol):
                return this.getV2Allowance(tokenSymbol, signer);
            default:
                throw new Error("[EvmConnect] Unsupported token symbol.");
        }
    }

    async getV2Allowance(tokenSymbol: string, signer: ethers.Signer) {
        const chainToken = this.getV2Token(tokenSymbol);
        if (!chainToken) return Promise.reject("[EvmConnect] Unknown chainToken.");
        const { vault_type, vault_address, address } = chainToken
        if (!vault_type || !vault_address || !address)
            throw new Error("missing token config");

        if (vault_type === "outgoing") {
            // outgoing vaults are a wrapper of erc20 tokens
            // For spending tokens, they need to get approved as a spender of the amount of token from the user account.
            const erc20Contract = Erc20Abi__factory.connect(address, signer);
            return await erc20Contract.allowance(
                await signer.getAddress(),
                vault_address,
            );
        }

        return ethers.utils.parseEther("0");
    }

    /**
     * Parses logs from a transaction and returns an array of events.
     *
     * @param {string} txHash - The transaction hash.
     * @returns {Promise<Array<TransferEvent | BridgeDepositEvent | BridgeReleaseEvent>>} - A promise that resolves with an array of parsed events.
     */
    async parseLogs(
        txHash: string
    ): Promise<Array<TransferEvent | BridgeDepositEvent | BridgeReleaseEvent>> {
        try {
            const events: Array<
                TransferEvent | BridgeDepositEvent | BridgeReleaseEvent
            > = [];
            const parser = new EvmBridgeEventsParser();
            const transactionReceipt =
                await this.__providers.rpcProvider.getTransactionReceipt(txHash);

            if (!transactionReceipt || !("logs" in transactionReceipt)) {
                return [];
            }

            for (const log of transactionReceipt.logs) {
                const deposit = parser.parseDeposit([log]);
                const release = parser.parseRelease([log]);
                const transfer = parser.parseTransfer([log]);

                if (deposit) events.push(deposit);
                if (release) events.push(release);
                if (transfer) events.push(transfer);
            }

            return events;
        } catch (error: any) {
            return Promise.reject(error.message);
        }
    }

    /**
     * Retrieves the block number of a transaction.
     *
     * @param {string} txHash - The transaction hash.
     * @returns {Promise<number>} - A promise that resolves with the block number of the transaction.
     */
    async getBlockNumber(txHash: string): Promise<number> {
        try {
            const transactionReceipt =
                await this.__providers.rpcProvider.getTransactionReceipt(txHash);
            const blockNumber = transactionReceipt.blockNumber;
            return blockNumber;
        } catch (error: any) {
            return Promise.reject(error.message);
        }
    }

    /**
     * Retrieves the timestamp from a block number.
     *
     * @param {number} blockNumber - The block number.
     * @returns {Promise<number>} - A promise that resolves with the timestamp of the block.
     */
    async getTimeStampFromBlockNumber(blockNumber: number): Promise<number> {
        try {
            const block = await this.__providers.rpcProvider.getBlock(blockNumber);
            const timestamp = block.timestamp;
            return timestamp;
        } catch (error: any) {
            return Promise.reject(error.message);
        }
    }

    /**
     * Retrieves the timestamp of a transaction.
     *
     * @param {string} txHash - The transaction hash.
     * @returns {Promise<number>} - A promise that resolves with the timestamp of the transaction.
     */
    async getTimeStamp(txHash: string): Promise<number> {
        try {
            const transactionReceipt =
                await this.__providers.rpcProvider.getTransactionReceipt(txHash);
            const blockNumber = transactionReceipt.blockNumber;
            const block = await this.__providers.rpcProvider.getBlock(blockNumber);
            const timestamp = block.timestamp;
            return timestamp;
        } catch (error: any) {
            return Promise.reject(error.message);
        }
    }

    /**
     * Retrieves the status of a transaction.
     *
     * @param {string} txHash - The transaction hash.
     * @returns {Promise<ChainStatus>} - A promise that resolves with the status of the transaction.
     */
    async getTxnStatus(txHash: string): Promise<ChainStatus> {
        try {
            const txnReceipt =
                await this.__providers.rpcProvider.getTransactionReceipt(txHash);
            let returnValue: ChainStatus = ChainStatus.Unknown;
            if (txnReceipt.status === 1) {
                returnValue = ChainStatus.Completed;
            } else if (txnReceipt.status === 0) {
                returnValue = ChainStatus.Failed;
            } else {
                returnValue = ChainStatus.Pending;
            }
            return Promise.resolve(returnValue);
        } catch (error: any) {
            return Promise.reject(error.message);
        }
    }

    /**
     * Retrieves the chain network from a chain ID.
     *
     * @param {number} chainId - The chain ID.
     * @returns {BridgeNetworks | undefined} - The bridge network corresponding to the chain ID, or undefined if not found.
     */
    getChainFromID(chainId: number): BridgeNetworks | undefined {
        try {
            const returnValue = Object.entries(NetworkIdentifiers).find(([_id]) => {
                return Number(_id) === chainId;
            });
            return returnValue ? returnValue[1] : undefined;
        } catch (error: any) {
            return undefined;
        }
    }

    /**
     * Checks if the signer is connected to the correct chain.
     *
     * @private
     * @param {ethers.Signer} signer - The signer to check.
     * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the signer is connected to the correct chain.
     */
    private async isCorrectChain(signer: ethers.Signer): Promise<boolean> {
        // retrieve signer chain ID
        const signerChainId = await signer.getChainId();
        // retrieve provider chain ID
        const { chainId: providerChainId } = await this.provider.getNetwork();
        // does it all match?
        return (
            this.__config.chainId === signerChainId &&
            signerChainId === providerChainId
        );
    }

    /**
     * Bridge tokens to another supported chain
     *
     * @param {string | PublicKey | algosdk.Account} destinationWallet receiver address on destination chain
     * @param {BridgeNetworks} destination destination chain
     * @param {"USDC"} tokenSymbol only USDC for now
     * @param {string | ethers.BigNumber} amount in base units e.g 1_000_000 for 1USDC
     * @param {ethers.Signer} signer to sign transaction
     * @param {boolean} [v2] is this a bridge v2 deposit?
     * @param {boolean} [protocolId] for deposit processed by partners, protocolId allows the process of fee sharing
     * @returns {Promise<ethers.ContractTransaction>} returns the transaction response
     */
    async bridge(
        destinationWallet: string | PublicKey | algosdk.Account,
        destination: BridgeNetworks,
        tokenSymbol: string,
        amount: ethers.BigNumber | string,
        signer: ethers.Signer,
        v2?: boolean,
        protocolId?: number
    ): Promise<ethers.ContractTransaction> {
        v2 ||= this.isValidV2Token(tokenSymbol);
        // if this is not a v2 bridging deposit
        if (!this.isValidToken(tokenSymbol) || !v2) {
            throw new Error(`[EvmConnect] Unsupported token symbol.`);
        }

        if (destination === this.__network) {
            throw new Error("[EvmConnect] Cannot transfer tokens to same chain.");
        }

        try {
            const signerAddress = await signer.getAddress();
            const isCorrectChain = await this.isCorrectChain(signer);
            if (!isCorrectChain)
                throw new Error(
                    `[EvmConnect] Signer should be connected to network ${this.__network}`
                );

            // V1 Bridging
            if (this.isValidToken(tokenSymbol)) {

                const bridge = TokenBridge__factory.connect(
                    this.getAddress("bridge"),
                    signer
                );

                const token = this.getToken(tokenSymbol)!;

                if (token.supportedDestination) {
                    if (!token.supportedDestination.map(x => x.toLowerCase()).includes(destination.toLowerCase())) {
                        throw new Error(
                            "[EvmConnect] Token unsupported on destination chain."
                        );
                    }
                }

                if (!token.address) {
                    throw new Error("[EvmConnect] Token address not found.");
                }

                const depositAddress = this.getAddress("depositWallet");
                const _amount =
                    typeof amount === "string" ? ethers.BigNumber.from(amount) : amount;

                const serlized = SerializeEvmBridgeTransfer.serialize(
                    this.__network,
                    destination,
                    signerAddress,
                    walletToAddress(destinationWallet),
                    _amount
                );

                return await bridge.deposit(
                    serlized.destinationChain,
                    serlized.amount,
                    depositAddress,
                    token.address,
                    serlized.destinationWallet
                );
            }

            // handle deposit on bridge v2
            if (v2) {
                if (
                    destination == BridgeNetworks.algorand ||
                    destination == BridgeNetworks.solana ||
                    destination == BridgeNetworks.TRON
                ) {
                    throw new Error(
                        `network ${destination} is not yet supported by the v2 bridge`
                    );
                }
                // parse target wallet address
                const targetWallet = addr_to_pk(destinationWallet);
                return this.deposit_bridgeV2({
                    amount,
                    destination,
                    targetWallet,
                    protocolId,
                    signer,
                    tokenSymbol,
                });
            }

            throw new Error("[EvmConnect] Bridge error, token is neither v1 nor v2")

        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Deposits tokens using the bridge V2.
     *
     * @private
     * @param {Object} options - The options for the deposit.
     * @param {ethers.BigNumber | string} options.amount - The amount of tokens to deposit.
     * @param {BridgeEvmNetworks} options.destination - The destination EVM network.
     * @param {Buffer} options.targetWallet - The target wallet address.
     * @param {ethers.Signer} options.signer - The signer to use for the deposit transaction.
     * @param {string} options.tokenSymbol - The symbol of the token to deposit.
     * @param {number} [options.protocolId=0] - The protocol ID for the deposit (optional).
     * @returns {Promise<ethers.ContractTransaction>} - A promise that resolves with the deposit transaction.
     */
    private async deposit_bridgeV2({
        amount,
        destination,
        targetWallet,
        protocolId = 0,
        signer,
        tokenSymbol,
    }: {
        amount: ethers.BigNumber | string;
        destination: BridgeEvmNetworks;
        targetWallet: Buffer;
        signer: ethers.Signer;
        tokenSymbol: string;
        protocolId?: number;
    }): Promise<ethers.ContractTransaction> {
        // instantiate bridgeV2 contract
        const bridgeV2Contract = BridgeV2Abi__factory.connect(
            this.getAddress("tokenBridge"),
            signer
        );

        // get chain Id
        const chainId = getNumericNetworkId(destination);

        // get deposited token config
        const chainToken = BridgeV2Tokens.getChainConfig(this.network, tokenSymbol);
        if (!chainToken) throw new Error("could not load token config");
        const { vault_type, vault_address, address } = chainToken;
        if (!vault_type || !vault_address || !address)
            throw new Error("missing token config");

        // estimate gas price
        const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } =
            await this.provider.getFeeData();
        if (!gasPrice) {
            throw new Error("cannot estimate gas costs");
        }
        console.log(
            `Current gas price is ${gasPrice.div(10 ** 9).toString()} gwei`
        );
        console.log(
            `Current maxFeePerGas is ${maxFeePerGas?.div(10 ** 9).toString()} gwei`
        );
        console.log(
            `Current maxPriorityFeePerGas is ${maxPriorityFeePerGas
                ?.div(10 ** 9)
                .toString()} gwei`
        );

        console.log("Calling deposit function");
        const depositArgs = [
            vault_address,
            amount,
            chainId,
            targetWallet,
            protocolId,
        ] as const;
        let tx;
        if (
            this.network == BridgeNetworks.Polygon ||
            !maxFeePerGas ||
            !maxPriorityFeePerGas
        ) {
            tx = await bridgeV2Contract.deposit(...depositArgs, { gasPrice });
        } else {
            tx = await bridgeV2Contract.deposit(...depositArgs, {
                maxFeePerGas,
                maxPriorityFeePerGas,
            });
        }

        return tx;
    }

    /**
     * Retrieves the hashed transaction ID.
     *
     * @param {string} txnID - The transaction ID.
     * @returns {string} - The hashed transaction ID.
     */
    public getTxnHashed(txnID: string): string {
        return ethers.utils.keccak256(txnID);
    }

    /**
     * Generates a new Ethereum wallet.
     *
     * @returns {ethers.Wallet} - The generated Ethereum wallet.
     */
    public get generateWallet(): ethers.Wallet {
        return ethers.Wallet.createRandom();
    }

    /**
     * Retrieves the token configuration (V1)for a given token symbol.
     *
     * @param {string} tokenSymbol - The symbol of the token.
     */
    public getToken(tokenSymbol: string) {
        return this.isValidV2Token(tokenSymbol) ? this.getV2Token(tokenSymbol) : this.getV1Token(tokenSymbol);
    }

    private getV1Token(tokenSymbol: string): BridgeTokenConfig | undefined {
        return BridgeTokens.getToken(this.__network, tokenSymbol) as
            | BridgeTokenConfig
            | undefined;
    }

    private getV2Token(tokenSymbol: string) {
        const token = BridgeV2Tokens.getTokenConfig(this.network, tokenSymbol);
        if (!token) throw new Error("Token v2 not found");
        const chainConfig = BridgeV2Tokens.getTokenConfigChild(token, this.network);
        return {
            ...chainConfig,
            supportedDestination: token?.chains.map((c) => c.chain) as BridgeNetworks[],
        }
    }
}
