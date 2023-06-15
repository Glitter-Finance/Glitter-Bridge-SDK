import {
    Connection,
    ParsedTransactionWithMeta,
    PublicKey,
} from "@solana/web3.js";
import {
    BridgeNetworks,
    BridgeType,
    ChainStatus,
    PartialBridgeTxn,
    Routing,
    TransactionType,
    getHashedTransactionId,
} from "@glitter-finance/sdk-core";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import BigNumber from "bignumber.js";
import { BorshCoder, EventParser } from "@project-serum/anchor";
import { BridgeTokens, RoutingHelper } from "@glitter-finance/sdk-core";
import { SolanaPollerCommon } from "./poller.solana.common";

const idl = {
    version: "0.1.0",
    name: "glitter_finance_solana_contracts",
    instructions: [
        {
            name: "initialize",
            accounts: [],
            args: [],
        },
    ],
    types: [
        {
            name: "RoutingInfo",
            type: {
                kind: "struct" as const,
                fields: [
                    {
                        name: "address",
                        type: "bytes" as const,
                    },
                    {
                        name: "network",
                        type: "u16" as const,
                    },
                ],
            },
        },
    ],
    events: [
        {
            name: "DepositEvent",
            fields: [
                {
                    name: "amount",
                    type: "f64" as const,
                    index: false,
                },
                {
                    name: "units",
                    type: "u64" as const,
                    index: false,
                },
                {
                    name: "mint",
                    type: "publicKey" as const,
                    index: false,
                },
                {
                    name: "from",
                    type: {
                        defined: "RoutingInfo",
                    },
                    index: false,
                },
                {
                    name: "to",
                    type: {
                        defined: "RoutingInfo",
                    },
                    index: false,
                },
            ],
        },
        {
            name: "ReleaseEvent",
            fields: [
                {
                    name: "amount",
                    type: "f64" as const,
                    index: false,
                },
                {
                    name: "amount_units",
                    type: "u64" as const,
                    index: false,
                },
                {
                    name: "fee",
                    type: "f64" as const,
                    index: false,
                },
                {
                    name: "fee_units",
                    type: "u64" as const,
                    index: false,
                },
                {
                    name: "deposit_hash",
                    type: "bytes" as const,
                    index: false,
                },
                {
                    name: "mint",
                    type: "publicKey" as const,
                    index: false,
                },
                {
                    name: "from",
                    type: {
                        defined: "RoutingInfo",
                    },
                    index: false,
                },
                {
                    name: "to",
                    type: {
                        defined: "RoutingInfo",
                    },
                    index: false,
                },
            ],
        },
        {
            name: "RefundEvent",
            fields: [
                {
                    name: "amount",
                    type: "f64" as const,
                    index: false,
                },
                {
                    name: "units",
                    type: "u64" as const,
                    index: false,
                },
                {
                    name: "deposit_hash",
                    type: "bytes" as const,
                    index: false,
                },
                {
                    name: "mint",
                    type: "publicKey" as const,
                    index: false,
                },
                {
                    name: "from",
                    type: {
                        defined: "RoutingInfo",
                    },
                    index: false,
                },
                {
                    name: "to",
                    type: {
                        defined: "RoutingInfo",
                    },
                    index: false,
                },
            ],
        },
    ],
};

export class SolanaV2Parser {

    public static async process(
        sdkServer: GlitterSDKServer,
        client: Connection | undefined,
        txn: ParsedTransactionWithMeta
    ): Promise<PartialBridgeTxn> {
        
        //Get txnId
        const txnID = txn.transaction.signatures[0];

        //Get Bridge Address
        const bridgeID = sdkServer.sdk.solana?.getAddress("tokenBridgeV2Address") ;
        if (!bridgeID || typeof bridgeID !== "string")
            throw Error("Bridge ID is undefined");

        //Get Solana Transaction data
        const txnHashed = getHashedTransactionId(BridgeNetworks.solana, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.TokenV2,
            txnType: TransactionType.Unknown,
            network: "solana",
            address: bridgeID || "",
        };

        //Check txn status
        if (txn.meta?.err) {
            partialTxn.chainStatus = ChainStatus.Failed;
            console.warn(`Transaction ${txnID} failed`);
        } else {
            partialTxn.chainStatus = ChainStatus.Completed;
        }

        //Get Timestamp & slot
        partialTxn.txnTimestamp = new Date((txn.blockTime || 0) * 1000); //*1000 is to convert to milliseconds
        partialTxn.block = txn.slot;

        try {
            const messages = txn.meta?.logMessages;
            if (!messages) throw Error("Log messages are undefined");

            //Get Parser
            const coder = new BorshCoder(idl);
            const programId = new PublicKey(bridgeID);
            const eventParser = new EventParser(programId, coder);

            //Parse Messages
            const events = eventParser.parseLogs(messages);
            let depositEvent: any = null;
            let releaseEvent: any = null;
            let refundEvent: any = null;
            let eventCount = 0;
            for (const event of events) {
                switch (event.name) {
                    case "DepositEvent":
                        depositEvent = event;
                        eventCount++;
                        break;
                    case "ReleaseEvent":
                        releaseEvent = event;
                        eventCount++;
                        break;
                    case "RefundEvent":
                        refundEvent = event;
                        eventCount++;
                        break;
                }
            }
            if (eventCount > 1) throw Error("Multiple events found in transaction");

            //Handle Events
            if (depositEvent) {
                console.info(`Transaction ${txnID} is a deposit`);
                partialTxn = await this.handleDeposit(
                    sdkServer,
                    txn,
                    partialTxn,
                    depositEvent
                );
            } else if (releaseEvent) {
                console.info(`Transaction ${txnID} is a release`);
                partialTxn = await this.handleRelease(
                    sdkServer,
                    txn,
                    partialTxn,
                    releaseEvent
                );
            } else if (refundEvent) {
                console.info(`Transaction ${txnID} is a refund`);
                partialTxn = await this.handleRefund(
                    sdkServer,
                    txn,
                    partialTxn,
                    refundEvent
                );
            } else {
                console.info(`Transaction ${txnID} is unknown`);
            }
        } catch (e) {
            console.error(e);
        }

        return partialTxn;
    }

    private static async handleDeposit(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        partialTxn: PartialBridgeTxn,
        depositEvent: any
    ): Promise<PartialBridgeTxn> {

        //Set type
        partialTxn.txnType = TransactionType.Deposit;

        //Get token Information
        const tokenAddress = depositEvent.data.mint.toBase58();
        const token = BridgeTokens.getFromAddress(BridgeNetworks.solana, tokenAddress);
        if (!token) throw Error("Token not found");
        partialTxn.tokenSymbol = token?.symbol || "";

        //Get Address
        const data = SolanaPollerCommon.
            getSolanaAddressWithAmount(sdkServer, txn, null, true);
        partialTxn.address = data[0] || "";
        
        //Get amount;
        const amountTransferred = BigNumber(-data[1]) || BigNumber(0)
        const amountEvent = RoutingHelper.BaseUnits_FromReadableValue(
            BigNumber(depositEvent.data.amount), token.decimals);
        if (!amountEvent.minus(amountTransferred).eq(0)) {
            throw Error("Amount transferred does not match amount in event");
        }

        //Get to Address
        const toAddressBuffer = depositEvent.data.to.address;
        const toAddress = toAddressBuffer.toString("base64");
        const toNetwork = depositEvent.data.to.network;

        //Set Routing
        partialTxn.routing = this.getV1Routing(
            "solana",
            partialTxn.address || "",
            partialTxn.tokenSymbol,
            partialTxn.txnID,
            toNetwork,
            toAddress,
            partialTxn.tokenSymbol,
            "",
            amountTransferred,
            token.decimals
        );
        
        return partialTxn;
    }
    private static async handleRelease(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        partialTxn: PartialBridgeTxn,
        releaseEvent: any
    ): Promise<PartialBridgeTxn> {
        return partialTxn;
    }
    private static async handleRefund(
        sdkServer: GlitterSDKServer,
        txn: ParsedTransactionWithMeta,
        partialTxn: PartialBridgeTxn,
        refundEvent: any
    ): Promise<PartialBridgeTxn> {
        return partialTxn;
    }
    private static getV1Routing(
        fromNetwork: string,
        fromAddress: string,
        fromToken: string,
        fromTxnID: string,
        toNetwork: string,
        toAddress: string,
        toToken: string,
        toTxnID: string,
        units: BigNumber,
        decimals: number
    ): Routing {
        return {
            from: {
                network: fromNetwork,
                address: fromAddress,
                token: fromToken,
                txn_signature: fromTxnID,
            },
            to: {
                network: toNetwork,
                address: toAddress,
                token: toToken,
                txn_signature: toTxnID,
            },
            units: units,
            amount: RoutingHelper.ReadableValue_FromBaseUnits(units, decimals),
        };
    }
}
