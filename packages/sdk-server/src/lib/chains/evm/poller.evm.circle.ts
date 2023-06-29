import { BridgeNetworks, BridgeType, ChainStatus, DeserializeEvmBridgeTransfer, EvmConnect, NetworkIdentifiers, PartialBridgeTxn, Routing, RoutingHelper, TransactionType } from "@glitter-finance/sdk-core/dist";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { EvmBridgeUSDCEventsParser, USDCBridgeEventGroup } from "./poller.evm.eventparser.circle";
import { TransactionReceipt } from "@ethersproject/abstract-provider";
import BigNumber from "bignumber.js";

export class EvmCircleParser {
    public static async process(
        sdkServer: GlitterSDKServer,
        connect: EvmConnect | undefined,
        txnID: string
    ): Promise<PartialBridgeTxn> {

        //ensure connect is defined
        if (!connect) throw Error("EVM Connect is undefined");

        //Get Bridge Address
        const bridgeID = connect?.getAddress("bridge");
        if (!bridgeID || typeof bridgeID !== "string")
            throw Error("Bridge ID is undefined");
            
        //Get Solana Transaction data
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: connect?.getTxnHashed(txnID),
            bridgeType: BridgeType.Circle,
            txnType: TransactionType.Unknown,
            network: connect?.network,
            address: bridgeID || "",
            protocol: "Glitter Finance"
        };
     
        //Get txn receipt
        const txnReceipt = await connect.provider.getTransactionReceipt(txnID);
        partialTxn.block = txnReceipt.blockNumber;

        //Get Gas
        const gasPaid = txnReceipt.gasUsed.mul(txnReceipt.effectiveGasPrice);
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
        } else {
            throw new Error("Unknown event type");
        }
        
        //return
        return partialTxn;
    }
    public static async parseLogs(receipt: TransactionReceipt): Promise<USDCBridgeEventGroup | null> {
      
        const parsedLogs = EvmBridgeUSDCEventsParser.parseLogs(receipt.logs);

        const returnValue:USDCBridgeEventGroup = { };
        const deposit = EvmBridgeUSDCEventsParser.parseDeposit(parsedLogs);
        const release = EvmBridgeUSDCEventsParser.parseRelease(parsedLogs);
        const transfer = EvmBridgeUSDCEventsParser.parseTransfer(parsedLogs);
               
        if (deposit) { returnValue.deposit = deposit; }
        if (release) { returnValue.release = release; }
        if (transfer) { returnValue.transfer = transfer; }

        return returnValue;
       
    }    
   
    static async handleDeposit(
        txnID: string,
        connect: EvmConnect,
        txn: TransactionReceipt,
        partialTxn: PartialBridgeTxn,
        events: USDCBridgeEventGroup
    ): Promise<PartialBridgeTxn> {

        const decimals = 6;

        //Get Addresses
        let toAddress = txn.to;
        let fromAddress = txn.from;        
       
        //Get transfer amount
        if (events.transfer) {
            fromAddress = events.transfer.from;
            toAddress = events.transfer.to;
            partialTxn.units = BigNumber(events.transfer.value.toString());
            partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);  
        } else {
            throw new Error("No transfer event found");   
        }

        //get token:
        let tokenSymbol = "USDC";
        if (connect.network == BridgeNetworks.Ethereum && events.deposit?.erc20Address?.toString() == "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c") {
            tokenSymbol = "EUROC";
        } else if (connect.network == BridgeNetworks.Avalanche && events.deposit?.erc20Address?.toString() == "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD") {
            tokenSymbol = "EUROC";
        }
        partialTxn.tokenSymbol = tokenSymbol;
        partialTxn.baseSymbol = tokenSymbol;

        //Check Type
        if (toAddress.toLocaleLowerCase() == connect.getAddress("depositWallet")?.toLocaleLowerCase()) {

            //transfer into deposit address
            partialTxn.txnType = TransactionType.Deposit;
            partialTxn.address = fromAddress;

        } else if (fromAddress.toLocaleLowerCase() == connect.getAddress("depositWallet").toLocaleLowerCase()) {

            //Transfer out of deposit address
            if (events.deposit || events.release) {
                partialTxn.txnType = TransactionType.Refund;
                partialTxn.address = toAddress;
            } else {
                partialTxn.txnType = TransactionType.Transfer;
                partialTxn.address = toAddress;
            }
        }

        //Get Routing
        let routing: Routing | null = null;
        if (partialTxn.txnType == TransactionType.Deposit) {
            const toNetwork = connect.getChainFromID(events.deposit?.destinationChainId || 0);
            toAddress = toNetwork ? DeserializeEvmBridgeTransfer.deserializeAddress(toNetwork, events.deposit?.destinationWallet || "") : "";
            routing = {
                from: {
                    network: connect.network,
                    address: events.transfer?.from || "",
                    token: tokenSymbol,
                    txn_signature: txnID,
                },
                to: {
                    network: toNetwork?.toString() || "",
                    address: toAddress,
                    token: tokenSymbol
                },
                amount: partialTxn.amount || BigNumber(0),
                units: partialTxn.units || BigNumber(0),
            };
        } else if (partialTxn.txnType == TransactionType.Refund) {
            routing = {
                from: {
                    network: "",
                    address: "",
                    token: tokenSymbol,
                    txn_signature_hashed: events.release?.depositTransactionHash,
                },
                to: {
                    network: connect.network,
                    address: partialTxn.address || "",
                    token: tokenSymbol,
                    txn_signature: txnID,
                },
                amount: partialTxn.amount || undefined,
                units: partialTxn.units || undefined,
            };
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
        events: USDCBridgeEventGroup
    ): Promise<PartialBridgeTxn> {
        const decimals = 6;

        //Get Addresses
        let toAddress = txn.to;
        let fromAddress = txn.from;
       
        //Get transfer amount
        if (events.transfer) {
            fromAddress = events.transfer.from;
            toAddress = events.transfer.to;
            partialTxn.units = BigNumber(events.transfer.value.toString());
            partialTxn.amount = RoutingHelper.ReadableValue_FromBaseUnits(partialTxn.units, decimals);  
        } else {
            throw new Error("No transfer event found");
        }

        //get token:
        let tokenSymbol = "USDC";
        if (connect.network == BridgeNetworks.Ethereum && events.release?.erc20Address?.toString() == "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c") {
            tokenSymbol = "EUROC";
        } else if (connect.network == BridgeNetworks.Avalanche && events.release?.erc20Address?.toString() == "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD") {
            tokenSymbol = "EUROC";
        }
        partialTxn.tokenSymbol = tokenSymbol;
        partialTxn.baseSymbol = tokenSymbol;

        //Get Routing
        let routing: Routing | null = null;
        if (toAddress.toLocaleLowerCase() == connect.getAddress("releaseWallet").toLocaleLowerCase()) {

            //transfer into receiver address
            partialTxn.txnType = TransactionType.Transfer;
            partialTxn.address = fromAddress;

        } else if (fromAddress.toLocaleLowerCase() == connect.getAddress("releaseWallet").toLocaleLowerCase()) {

            //Transfer out of receiver address
            partialTxn.txnType = TransactionType.Release;
            partialTxn.address = toAddress;

            //Get Routing
            routing = {
                from: {
                    network: "",
                    address: "",
                    token: tokenSymbol,
                    txn_signature_hashed: events.release?.depositTransactionHash,
                },
                to: {
                    network: connect.network,
                    address: partialTxn.address || "",
                    token: tokenSymbol,
                    txn_signature: txnID,
                },
                amount: partialTxn.amount || BigNumber(0),
                units: partialTxn.units || BigNumber(0),
            };
        }

        //Set routing
        partialTxn.routing = routing;

        return Promise.resolve(partialTxn);
    }

    static getNetworkId(network: BridgeNetworks): number {
        const netIds = Object.entries(NetworkIdentifiers);
        const _network = netIds.find((n) => n[1] === network);
        if (!_network) throw new Error("Unable to identify network");

        return parseInt(_network[0]);
    }

}