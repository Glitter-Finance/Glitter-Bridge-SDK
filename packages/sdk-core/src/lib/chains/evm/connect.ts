import {
    BridgeDepositEvent,
    BridgeReleaseEvent,
    EvmNetworkConfig,
    TransferEvent,
} from "./types";
import { ethers, providers } from "ethers";
import {
    ERC20,
    ERC20__factory,
    TokenBridge,
    TokenBridge__factory,
} from "glitter-evm-contracts";
import { EvmBridgeEventsParser } from "./events";
import { PublicKey } from "@solana/web3.js";
import algosdk from "algosdk";
import { SerializeEvmBridgeTransfer } from "./serde";
import {
    BridgeEvmNetworks,
    BridgeNetworks,
    NetworkIdentifiers,
    getNumericNetworkId,
} from "../../common/networks";
import { ChainStatus } from "../../common/transactions";
import { parseAddress_bridgeV2, walletToAddress } from "../../common/utils/utils";
import { BridgeTokens, BridgeTokenConfig, Token2ConfigList, BridgeV2Tokens } from "../../../lib/common";
import bridgeV2Abi from "./abi/bridgeV2.abi.json"
import erc20Abi from "./abi/erc20.abi.json"
import { BridgeV2Abi, Erc20Abi } from "src/typechain";

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

    constructor(network: BridgeEvmNetworks, config: EvmNetworkConfig, bridgeV2Tokens?:Token2ConfigList) {
        this.__config = config;
        this.__network = network;
        BridgeTokens.loadConfig(this.__network, config.tokens);
        this.__providers = this.createConnections(config.rpcUrl, config);
        if(bridgeV2Tokens) BridgeV2Tokens.loadConfig(bridgeV2Tokens);
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
   * @param {"tokens" | "bridge" | "depositWallet" | "releaseWallet"| "tokenBridge"} entity The type of address to provide
   * @param {"USDC"} tokenSymbol only USDC for now
   * @returns {string} returns the address for the given entity
   */
    getAddress(
        entity: "tokens" | "bridge" | "depositWallet" | "releaseWallet"| "tokenBridge",
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
   * Check if provided signer is
   * connected to same chain as EvmConnect
   * to execute a transaction
   * @param {ethers.Signer} signer the signer to check
   * @returns {Promise<boolean>} true if signer is connected to correct chain
   */
    private async isCorrectChain(signer: ethers.Signer): Promise<boolean> {
        // retrieve signer chain ID
        const signerChainId = await signer.getChainId();
        // retrieve provider chain ID
        const { chainId: providerChainId } = await this.provider.getNetwork();
        // does it all match?
        return this.__config.chainId === signerChainId && signerChainId===providerChainId;
    }

    /**
   * Bridge tokens to another supported chain
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
        v2?:boolean,
        protocolId?:number
    ): Promise<ethers.ContractTransaction> {
        
        try {
            const signerAddress = await signer.getAddress();
            const isCorrectChain = await this.isCorrectChain(signer);
            if (!isCorrectChain)
                throw new Error(
                    `[EvmConnect] Signer should be connected to network ${this.__network}`
                );

            // parse target wallet address
            const targetWallet=parseAddress_bridgeV2(destinationWallet)

            // handle deposit on bridge v2
            if(v2){
                return this.deposit_bridgeV2({ amount, destination, targetWallet, protocolId, signer, tokenSymbol })
            }

            // if this is not a v2 bridging deposit
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

    private async deposit_bridgeV2 ({
        amount,        
        destination,       
        targetWallet,        
        protocolId=0,       
        signer,
        tokenSymbol
    }: {
        amount: ethers.BigNumber | string        
        destination: BridgeNetworks,
        targetWallet: string        
        signer: ethers.Signer
        tokenSymbol: string
        protocolId?: number        
        }): Promise<ethers.ContractTransaction> {
        
        // instantiate bridgeV2 contract
        const bridgeV2Contract = new ethers.Contract(this.getAddress("tokenBridge"), bridgeV2Abi, signer) as BridgeV2Abi
            
        // get chain Id
        const chainId=getNumericNetworkId(destination)

        // get deposited token config
        const chainToken = BridgeV2Tokens.getChainConfig(this.network, tokenSymbol)
        if(!chainToken) throw new Error("could not load token config")
        const { vault_type, vault_address, address }=chainToken
        if(!vault_type||!vault_address||!address) throw new Error("missing token config")
        
        // estimate gas price
        const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.provider.getFeeData()
        if (!gasPrice) {
            throw new Error("cannot estimate gas costs")
        }
        console.log(`Current gas price is ${gasPrice.div(10 ** 9).toString()} gwei`)
        console.log(`Current maxFeePerGas is ${maxFeePerGas?.div(10 ** 9).toString()} gwei`)
        console.log(`Current maxPriorityFeePerGas is ${maxPriorityFeePerGas?.div(10 ** 9).toString()} gwei`)
        
        if (vault_type === "outgoing") {
            // outgoing vaults are a wrapper of erc20 tokens
            // For spending tokens, they need to get approved as a spender of the amount of token from the user account.
            console.log("🔒 Approving vault as a token spender")            
            const tokenContract = new ethers.Contract(address, erc20Abi, signer) as Erc20Abi
            let approvalTx
            if (this.network == BridgeNetworks.Polygon || !maxFeePerGas || !maxPriorityFeePerGas) {
                approvalTx = await tokenContract.approve(vault_address, amount, { gasPrice })
            } else {
                approvalTx = await tokenContract.approve(vault_address, amount, {
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                })
            }
            // Wait for 2 confirmations before proceeding with the deposit
            await approvalTx.wait(2)
            console.log("✅ Deposit done")
        }

        console.log("💰 Calling deposit function")
        const depositArgs = [
            vault_address,
            amount,
            chainId,
            Buffer.from(targetWallet, "hex"), // TODO figure out the desired encoding
            protocolId,
        ] as const
        let tx
        if (this.network == BridgeNetworks.Polygon || !maxFeePerGas || !maxPriorityFeePerGas) {
            tx = await bridgeV2Contract.deposit(...depositArgs, { gasPrice: gasPrice.toString() })
        } else {
            tx = await bridgeV2Contract.deposit(...depositArgs, { maxFeePerGas, maxPriorityFeePerGas })
        }

        return tx
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
        return BridgeTokens.getToken(this.__network, tokenSymbol) as BridgeTokenConfig | undefined; 
    }
}
