import {
    BridgeDepositEvent,
    BridgeReleaseEvent,
    EvmNetworkConfig,
    TransferEvent,
} from "./types";
import {ethers, providers} from "ethers";
import {
    ERC20,
    ERC20__factory,
    TokenBridge,
    TokenBridge__factory,
} from "glitter-evm-contracts";
import {EvmBridgeEventsParser} from "./events";
import {PublicKey} from "@solana/web3.js";
import algosdk from "algosdk";
import {SerializeEvmBridgeTransfer} from "./serde";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
    NetworkIdentifiers,
} from "../../common/networks";
import {ChainStatus} from "../../common/transactions";
import {walletToAddress} from "../../common/utils/utils";
import {BridgeTokens, BridgeTokenConfig} from "src/lib/common";

type Connection = {
  rpcProvider: providers.BaseProvider;
  bridge: TokenBridge;
  tokens: Map<string, ERC20>;
};

export class EvmConnect {
    protected readonly __network: BridgeEvmNetworks;
    protected readonly __providers: Connection;
    protected readonly __config: EvmNetworkConfig;

    private createConnections(
        rpcUrl: string,
        config: EvmNetworkConfig
    ): Connection {
        const bridgeAddress = config.bridge;
        const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const bridge = TokenBridge__factory.connect(bridgeAddress, rpcProvider);
        const tokens = new Map<string, ERC20>();

        config.tokens.map((_token) => {
            const symbol = _token.symbol.toLowerCase();
            tokens.set(
                symbol,
                ERC20__factory.connect(_token.address as string, rpcProvider)
            );
        }, {} as Record<string, ERC20>);

        return {
            rpcProvider,
            bridge,
            tokens,
        };
    }

    constructor(network: BridgeEvmNetworks, config: EvmNetworkConfig) {
        this.__config = config;
        this.__network = network;
        BridgeTokens.loadConfig(this.__network, config.tokens);
        this.__providers = this.createConnections(config.rpcUrl, config);
    }

    get provider(): ethers.providers.BaseProvider {
        return this.__providers.rpcProvider;
    }

    get config(): EvmNetworkConfig {
        return this.__config;
    }

    get network(): BridgeEvmNetworks {
        return this.__network;
    }
    /**
   * Provide address of bridge
   * component
   * @param {"tokens" | "bridge" | "depositWallet" | "releaseWallet"} entity
   * @param {"USDC"} tokenSymbol only USDC for now
   * @returns {string}
   */
    getAddress(
        entity: "tokens" | "bridge" | "depositWallet" | "releaseWallet",
        tokenSymbol?: string
    ): string {
        if (entity === "tokens") {
            if (!tokenSymbol)
                throw new Error("[EvmConnect] Please provide token symbol.");

            const token = this.__config.tokens.find(
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

    private isValidToken(tokenSymbol: string): boolean {
        return !!this.__providers.tokens.get(tokenSymbol.toLowerCase());
    }
    /**
   * Provide token balance of an address
   * on the connected evm network
   * @param {"USDC"} tokenSymbol only USDC for now
   * @param {string} address
   * @returns {ethers.BigNumber}
   */
    async getTokenBalanceOnNetwork(
        tokenSymbol: string,
        address: string
    ): Promise<ethers.BigNumber> {
        if (!this.isValidToken(tokenSymbol))
            return Promise.reject("[EvmConnect] Unsupported token symbol.");

        const symbol = tokenSymbol.toLowerCase();
        const erc20 = this.__providers.tokens.get(symbol);
        const balance = await erc20!.balanceOf(address);
        return balance;
    }
    /**
   * Before bridging tokens we need to check
   * if tokens are approved for bridge to use
   * if not, we can use this method to sign
   * and approve transaction
   * @param {"USDC"} tokenSymbol only USDC for now
   * @param {ethers.BigNumber | string} amount in BigNumber units e.g 1_000_000 for 1USDC
   * @param {ethers.Signer} signer to sign the transaction
   * @returns {ethers.ContractTransaction}
   */
    async approveTokensForBridge(
        tokenSymbol: string,
        amount: ethers.BigNumber | string,
        signer: ethers.Signer
    ): Promise<ethers.ContractTransaction> {
        if (!this.isValidToken(tokenSymbol))
            return Promise.reject("[EvmConnect] Unsupported token symbol.");

        const bridgeAddress = this.getAddress("bridge");
        const tokenAddress = this.getAddress("tokens", tokenSymbol);

        const token = ERC20__factory.connect(tokenAddress, signer);
        return await token.increaseAllowance(bridgeAddress, amount);
    }
    /**
   * Get the amount of tokens approved
   * to be used by the bridge
   * @param {"USDC"} tokenSymbol only USDC for now
   * @param {ethers.Signer} signer to sign the transaction
   * @returns {ethers.BigNumber}
   */
    async bridgeAllowance(
        tokenSymbol: string,
        signer: ethers.Signer
    ): Promise<ethers.BigNumber> {
        if (!this.isValidToken(tokenSymbol))
            return Promise.reject("Unsupported token symbol.");

        const tokenAddress = this.getAddress("tokens", tokenSymbol);
        const usdc = ERC20__factory.connect(tokenAddress, signer);

        const allowance = await usdc.allowance(
            signer.getAddress(),
            this.getAddress("bridge", tokenSymbol)
        );

        return allowance;
    }
    /**
   * Parse transaction receipts to retrieve
   * bridge transfer data
   * @param {string} txHash transaction hash of deposit or release event on evm chain
   * @returns {Array<TransferEvent | BridgeDepositEvent | BridgeReleaseEvent>}
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
    async getTimeStampFromBlockNumber(blockNumber: number): Promise<number> {
        try {
            const block = await this.__providers.rpcProvider.getBlock(blockNumber);
            const timestamp = block.timestamp;
            return timestamp;
        } catch (error: any) {
            return Promise.reject(error.message);
        }
    }
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
   * Check if provided wallet is
   * connected to same chain as EvmConnect
   * to execute a transaction
   * @param {ethers.Wallet} wallet
   * @returns {Promise<boolean>}
   */
    private async isCorrectChain(wallet: ethers.Signer): Promise<boolean> {
        const chainId = await wallet.getChainId();
        return this.__config.chainId === chainId;
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
    async bridge(
        destination: BridgeNetworks,
        tokenSymbol: string,
        amount: ethers.BigNumber | string,
        destinationWallet: string | PublicKey | algosdk.Account,
        signer: ethers.Signer
    ): Promise<ethers.ContractTransaction> {
        try {
            const signerAddress = await signer.getAddress();
            const isCorrectChain = await this.isCorrectChain(signer);
            if (!isCorrectChain)
                throw new Error(
                    `[EvmConnect] Signer should be connected to network ${this.__network}`
                );
            if (!this.isValidToken(tokenSymbol)) {
                throw new Error(`[EvmConnect] Unsupported token symbol.`);
            }

            if (destination === this.__network) {
                throw new Error("[EvmConnect] Cannot transfer tokens to same chain.");
            }

            const bridge = TokenBridge__factory.connect(
                this.getAddress("bridge"),
                signer
            );

            const tokenAddress = this.getAddress("tokens", tokenSymbol);
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
                tokenAddress,
                serlized.destinationWallet
            );
        } catch (error) {
            return Promise.reject(error);
        }
    }
    public getTxnHashed(txnID: string): string {
        return ethers.utils.keccak256(txnID);
    }

    // public async getUSDCPartialTxn(txnID: string): Promise<PartialBridgeTxn> {

    //   //USDC decimals
    //   let decimals = 6;

    //   //Get logs
    //   const logs = await this.parseLogs(txnID);

    //   //Get Timestamp
    //   const blockNumber = await this.getBlockNumber(txnID);
    //   const timestamp_s = await this.getTimeStampFromBlockNumber(blockNumber);
    //   const timestamp = new Date(timestamp_s * 1000);

    //   //Check deposit/transfer/release
    //   const releaseEvent = logs?.find(
    //     (log) => log.__type === "BridgeRelease"
    //   ) as BridgeReleaseEvent;

    //   const depositEvent = logs?.find(
    //     (log) => log.__type === "BridgeDeposit"
    //   ) as BridgeDepositEvent;

    //   const transferEvent = logs?.find(
    //     (log) => log.__type === "Transfer"
    //   ) as TransferEvent;

    //   //Get transaction type
    //   let type: TransactionType;
    //   if (releaseEvent) {
    //     type = TransactionType.Release;
    //   } else if (depositEvent) {
    //     type = TransactionType.Deposit;
    //   } else {
    //     type = TransactionType.Unknown;
    //   }

    //   //Get return object
    //   let returnTxn: PartialBridgeTxn = {
    //     txnID: txnID,
    //     txnIDHashed: this.getTxnHashed(txnID),
    //     bridgeType: BridgeType.USDC,
    //     txnType: type,
    //     txnTimestamp: timestamp,
    //     chainStatus: await this.getTxnStatus(txnID),
    //     network: this.__network,
    //     tokenSymbol: "usdc",
    //     block: blockNumber,
    //   };

    //   //Get txn params
    //   if (type === TransactionType.Deposit && transferEvent) {
    //     returnTxn.address = transferEvent.from;
    //     returnTxn.units =  BigNumber(depositEvent.amount.toString()) ;
    //     returnTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(returnTxn.units,decimals);

    //     //Get Routing
    //     let toNetwork = this.getChainFromID(depositEvent.destinationChainId);
    //     let toAddress = toNetwork ? DeserializeEvmBridgeTransfer.deserializeAddress(toNetwork, depositEvent.destinationWallet) : "";
    //     let routing: Routing = {
    //       from: {
    //         network: this.__network,
    //         address: transferEvent.from,
    //         token: "usdc",
    //         txn_signature: txnID,
    //       },
    //       to: {
    //         network: toNetwork?.toString() || "",
    //         address: toAddress,
    //         token: "usdc"
    //       },
    //       amount: returnTxn.amount,
    //       units: BigNumber(returnTxn.units),
    //     };
    //     returnTxn.routing = routing;

    //   } else if (type === TransactionType.Release && transferEvent) {

    //     returnTxn.address = releaseEvent.destinationWallet;
    //     returnTxn.units = BigInt(releaseEvent.amount.toString()).toString();
    //     returnTxn.amount = ValueUnits.fromUnits(BigInt(returnTxn.units), decimals).value;

    //     //Get Routing
    //     let routing: Routing = {
    //       from: {
    //         network: "",
    //         address: "",
    //         token: "usdc",
    //         txn_signature_hashed: releaseEvent.depositTransactionHash,
    //       },
    //       to: {
    //         network: this.__network,
    //         address: returnTxn.address,
    //         token: "usdc",
    //         txn_signature: txnID,
    //       },
    //       amount: returnTxn.amount,
    //       units: BigNumber(returnTxn.units),
    //     };
    //     returnTxn.routing = routing;

    //   }
    //   return Promise.resolve(returnTxn);
    // }
    public get generateWallet(): ethers.Wallet {
        return ethers.Wallet.createRandom();
    }

    public getToken(tokenSymbol: string): BridgeTokenConfig | undefined {
        return BridgeTokens.getToken(this.__network, tokenSymbol);
    }
}
