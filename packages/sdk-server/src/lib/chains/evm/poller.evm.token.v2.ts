import { BridgeType, BridgeV2Tokens, ChainStatus, DeserializeEvmBridgeTransfer, EvmConnect, PartialBridgeTxn, Routing, RoutingHelper, TransactionType, TransferEvent } from "@glitter-finance/sdk-core/dist";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { EvmBridgeV2EventsParser, TokenBridgeV2EventGroup } from "./poller.evm.eventparser.v2";
import { TransactionReceipt } from "@ethersproject/abstract-provider";
import BigNumber from "bignumber.js";
import { Routing2 } from "@glitter-finance/sdk-core/dist/lib/common/routing/routing.v2";
import { ethers } from "ethers";

export class EvmV2Parser {

    public static async process(
        sdkServer: GlitterSDKServer,
        connect: EvmConnect | undefined,
        txnID: string
    ): Promise<PartialBridgeTxn> {

        //check if connect is set
        if (!connect) throw Error("EVM Connect is undefined");

        //Get Bridge Address
        const bridgeID = connect?.getAddress("tokenBridge") ;   
        if (!bridgeID || typeof bridgeID !== "string")
            throw Error("Bridge ID is undefined");
            
        //Get EVM Transaction data
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: connect?.getTxnHashed(txnID),
            bridgeType: BridgeType.TokenV2,
            txnType: TransactionType.Unknown,
            network: connect?.network,
            address: bridgeID || "",
            protocol: "Glitter Finance"
        };

        //Get txn receipt
        const txnReceipt = await connect.provider.getTransactionReceipt(txnID);
        if (!txnReceipt) return partialTxn;
        partialTxn.block = txnReceipt.blockNumber;
        partialTxn.confirmations = txnReceipt.confirmations;

        //Check if effective gas price is set
        let gasPrice = new BigNumber(txnReceipt.effectiveGasPrice?.toString() || 0);
        if (!txnReceipt.effectiveGasPrice || txnReceipt.effectiveGasPrice.isZero()) {
            //ZKEvm does not have effective gas price
            const transaction = await connect.provider.getTransaction(txnID);
            if (transaction) {
                gasPrice = new BigNumber(transaction.gasPrice?.toString() || 0);
            }

        }
        
        //Get Gas
        const gasPaid = txnReceipt.gasUsed.mul(ethers.BigNumber.from(gasPrice.toString()));
        partialTxn.gasPaid = new BigNumber(gasPaid.toString());

        //Get timestamp
        const timestamp_s = partialTxn.block ? (await connect.getTimeStampFromBlockNumber(partialTxn.block)) : 0;
        const timestamp = new Date(timestamp_s * 1000);
        partialTxn.txnTimestamp = timestamp;
        
        //Check status
        if (txnReceipt.status === 0) {
            partialTxn.chainStatus = ChainStatus.Failed;
        } else if (txnReceipt.status === 1) {
            partialTxn.chainStatus = ChainStatus.Completed;
        } else {
            partialTxn.chainStatus = ChainStatus.Pending;
        }

        const events = await this.parseLogs(txnReceipt);
        if (!events) return partialTxn;
        
        //Check deposit vs release   
        if (events.deposit) {
            partialTxn = await this.handleDeposit(txnID, connect, txnReceipt, partialTxn, events);
        } else if (events.release) {
            partialTxn = await this.handleRelease(txnID, connect, txnReceipt, partialTxn, events);
        } else if (events.refund) {
            partialTxn = await this.handleRefund(txnID, connect, txnReceipt, partialTxn, events);
        } 

        return partialTxn;
    }
    
    public static async parseLogs(receipt: TransactionReceipt): Promise<TokenBridgeV2EventGroup | null> {
      
        const parsedLogs = EvmBridgeV2EventsParser.parseLogs(receipt.logs);

        const returnValue:TokenBridgeV2EventGroup = { };
        const deposit = EvmBridgeV2EventsParser.parseDeposit(parsedLogs);
        const release = EvmBridgeV2EventsParser.parseRelease(parsedLogs);
        const refund = EvmBridgeV2EventsParser.parseRefund(parsedLogs);
        const transfer = EvmBridgeV2EventsParser.parseTransfer(parsedLogs);
               
        if (deposit) { returnValue.deposit = deposit; }
        if (release) { returnValue.release = release; }
        if (refund) { returnValue.refund = refund; }
        if (transfer) { returnValue.transfer = transfer; }

        return returnValue;
       
    }
    static async handleDeposit(
        txnID: string,
        connect: EvmConnect,
        txn: TransactionReceipt,
        partialTxn: PartialBridgeTxn,
        events: TokenBridgeV2EventGroup 
    ): Promise<PartialBridgeTxn> {
       
        //Get Addresses
        let toAddress = txn.to;
        let fromAddress = txn.from;

        //get token info
        const fromToken = BridgeV2Tokens.getChainConfigByVault(connect?.network, events.deposit?.vault || "");
        if (!fromToken) throw new Error("From token not found")
        const baseToken = BridgeV2Tokens.getChainConfigParent(fromToken);
        if (!baseToken) throw new Error("Base token not found")
       
        partialTxn.tokenSymbol = baseToken.asset_symbol;

        //Get referral ID
        partialTxn.referral_id =events.deposit?.protocolId || undefined;

        //Get transfer amount
        if (events.transfer) {
            fromAddress = events.transfer.from;
            toAddress = events.transfer.to;
            partialTxn.units = BigNumber(events.transfer.value.toString());
            partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, fromToken.decimals);  
        } else {
            throw new Error("Transfer event not found");
        }

        //Check address
        if (fromToken?.vault_type?.toLocaleLowerCase() === "incoming"){

            //This is a burn/mint.  To address is the 0x0 address
            if (toAddress.toLocaleLowerCase() != "0x0000000000000000000000000000000000000000"){
                throw new Error("Invalid to address. Expected 0x0 for incoming vault");
            }

        } else if (fromToken?.vault_type?.toLocaleLowerCase() === "outgoing"){

            //This is a lock/release.  To Address is the vault address
            const vaultAddress = fromToken.vault_address || "";
            if (toAddress.toLocaleLowerCase() != vaultAddress.toLocaleLowerCase()){
                throw new Error(`Invalid to address. Expected ${vaultAddress} for outgoing vault`);
            }

        }
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.address = fromAddress;
       
        //Get Routing
        let routing: Routing2 | null = null;
        if (partialTxn.txnType == TransactionType.Deposit) {

            //Get To Network
            const toNetwork = connect.getChainFromID(events.deposit?.destinationChainId || 0);
            if (!toNetwork) throw new Error("To network not found");

            //Get To Token
            const toToken = BridgeV2Tokens.getTokenConfigChild(baseToken, toNetwork);
            if (!toToken) throw new Error("To token not found");

            toAddress = toNetwork ? DeserializeEvmBridgeTransfer.deserializeAddress(toNetwork, events.deposit?.destinationAddress || "") : "";
            routing = {
                from: {
                    network: connect.network,
                    address: events.transfer?.from || "",
                    local_symbol: fromToken.symbol,
                    base_units: partialTxn.units,
                    txn_signature: txnID,
                },
                to: {
                    network: toNetwork?.toString() || "",
                    address: toAddress,
                    local_symbol: toToken?.symbol || "",
                    base_units: RoutingHelper.BaseUnits_Shift(partialTxn.units, fromToken.decimals, toToken.decimals),
                },
                amount: partialTxn.amount || BigNumber(0),
            };
        } else if (partialTxn.txnType == TransactionType.Refund) {
            routing = {
                from: {
                    network: "",
                    address: "",
                    local_symbol: "",
                    base_units: undefined,
                    txn_signature_hashed: events.release?.depositId,
                },
                to: {
                    network: connect.network,
                    address: partialTxn.address || "",
                    local_symbol: fromToken.symbol,
                    txn_signature: txnID,
                    base_units: partialTxn.units,
                },
                amount: partialTxn.amount || undefined
            }as Routing2;
        }

        //Set routing
        partialTxn.routing = routing;

        return Promise.resolve(partialTxn);
    }
    static async handleRelease(
        txnID: string,
        connect: EvmConnect,
        txn: TransactionReceipt,
        partialTxn: PartialBridgeTxn,
        events: TokenBridgeV2EventGroup
    ): Promise<PartialBridgeTxn> {
              
        //Get Addresses
        let toAddress = txn.to;
        let fromAddress = txn.from;

        //get token name
        const toToken = BridgeV2Tokens.getChainConfigByVault(connect?.network, events.release?.vault || "");
        if (!toToken) throw new Error("From token not found")
        const baseToken = BridgeV2Tokens.getChainConfigParent(toToken);
        if (!baseToken) throw new Error("Base token not found")
      
        partialTxn.tokenSymbol = baseToken.asset_symbol;

        //Get transfer amount
        if (events.transfer) {
            fromAddress = events.transfer.from;
            toAddress = events.transfer.to;
            partialTxn.units = BigNumber(events.transfer.value.toString());
            partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, toToken.decimals);  
        } else {
            throw new Error("Transfer event not found");
        }

        //Check address
        if (toToken?.vault_type?.toLocaleLowerCase() === "incoming"){
            
            //This is a burn/mint.  From address is the 0x0 address
            if (fromAddress.toLocaleLowerCase() != "0x0000000000000000000000000000000000000000"){
                throw new Error("Invalid from address. Expected 0x0 for incoming vault");
            }

        } else if (toToken?.vault_type?.toLocaleLowerCase() === "outgoing"){

            //This is a lock/release.  From Address is the vault address
            const vaultAddress = toToken.vault_address || "";
            if (fromAddress.toLocaleLowerCase() != vaultAddress.toLocaleLowerCase()){
                throw new Error(`Invalid from address. Expected ${vaultAddress} for outgoing vault`);
            }

        }

        let routing: Routing2 | null = null;
      
        //Transfer out of receiver address
        partialTxn.txnType = TransactionType.Release;
        partialTxn.address = toAddress;

        //Get Routing
        routing = {
            from: {
                network: "",
                address: "",
                local_symbol: "",
                base_units: undefined,
                txn_signature_hashed: events.release?.depositId,
            },
            to: {
                network: connect.network,
                address: partialTxn.address || "",
                local_symbol: toToken.name,
                base_units: partialTxn.units,
                txn_signature: txnID,
            },
            amount: partialTxn.amount || undefined
        };
        // }

        //Set routing
        partialTxn.routing = routing;

        return Promise.resolve(partialTxn);
    }
    static async handleRefund(
        txnID: string,
        connect: EvmConnect,
        txn: TransactionReceipt,
        partialTxn: PartialBridgeTxn,
        events: TokenBridgeV2EventGroup
    ): Promise<PartialBridgeTxn> {
             
        //Get Addresses
        let toAddress = txn.to;
        let fromAddress = txn.from;

        //get token name
        const token = await BridgeV2Tokens.getChainConfigByVault(connect?.network, events.deposit?.vault || "");
        const tokenName = token?.symbol || "Unknown";
        const decimals = token?.decimals || 0;
      
        //Get transfer amount
        if (events.transfer) {
            fromAddress = events.transfer.from;
            toAddress = events.transfer.to;
            partialTxn.units = BigNumber(events.transfer.value.toString());
            partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);  
        } else {
            throw new Error("Transfer event not found");
        }

        let routing: Routing | null = null;
        
        //Check address
        if (token?.vault_type?.toLocaleLowerCase() === "incoming"){
            
            //This is a burn/mint.  From address is the 0x0 address
            if (fromAddress.toLocaleLowerCase() != "0x0000000000000000000000000000000000000000"){
                throw new Error("Invalid from address. Expected 0x0 for incoming vault");
            }

        } else if (token?.vault_type?.toLocaleLowerCase() === "outgoing"){

            //This is a lock/release.  From Address is the vault address
            const vaultAddress = token.vault_address || "";
            if (fromAddress.toLocaleLowerCase() != vaultAddress.toLocaleLowerCase()){
                throw new Error(`Invalid from address. Expected ${vaultAddress} for outgoing vault`);
            }

        }

        //Transfer out of receiver address
        partialTxn.txnType = TransactionType.Refund;
        partialTxn.address = toAddress;

        //Get Routing
        routing = {
            from: {
                network: "",
                address: "",
                token: tokenName,
                txn_signature_hashed: events.release?.depositId,
            },
            to: {
                network: connect.network,
                address: partialTxn.address || "",
                token: tokenName,
                txn_signature: txnID,
            },
            amount: partialTxn.amount || undefined,
            units: partialTxn.units || undefined,
        };
        //}

        //Set routing
        partialTxn.routing = routing;

        return Promise.resolve(partialTxn);
    }
}