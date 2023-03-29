import {
    Connection,
    ParsedInstruction,
    ParsedTransactionWithMeta,
    PartiallyDecodedInstruction,
    PublicKey,
} from "@solana/web3.js";
import {
    BridgeType,
    ChainStatus,
    PartialBridgeTxn,
    Routing,
    TransactionType,
} from "@glitter-finance/sdk-core";
import {GlitterSDKServer} from "../../glitterSDKServer";
import util from "util";
import bs58 from "bs58";

import * as anchor from "@project-serum/anchor";
import {deserialize} from "borsh";
import * as borsh from "borsh";
import BigNumber from "bignumber.js";
import {BorshCoder, EventParser} from "@project-serum/anchor";

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
                        type: "string" as const,
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
        const bridgeID = sdkServer.sdk.solana?.tokenBridgeV2Address;
        if (!bridgeID || typeof bridgeID !== "string")
            throw Error("Bridge ID is undefined");

        //Get Solana Transaction data
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: sdkServer.sdk?.solana?.getTxnHashedFromBase58(txnID),
            bridgeType: BridgeType.USDC,
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
            //Get Messages
            // const messages = [
            //     'Program HnoxGTCXd8Mvc9ucCXWWkCpibAcgSSYaVWuNVNbQc9hH invoke [1]',
            //     'Program log: Instruction: DepositNative',
            //     'Program 11111111111111111111111111111111 invoke [2]',
            //     'Program 11111111111111111111111111111111 success',
            //     'Program data: ePg9Ux+Oa5CamZmZmZnJPwDC6wsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAf5IJSLI5MS6wD08NSnoedP8wdMaa9/mHLD1BBj1IunUGAAAAU29sYW5hIAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAGFsZ29yYW5k',
            //     'Program HnoxGTCXd8Mvc9ucCXWWkCpibAcgSSYaVWuNVNbQc9hH consumed 12990 of 200000 compute units',
            //     'Program HnoxGTCXd8Mvc9ucCXWWkCpibAcgSSYaVWuNVNbQc9hH success'
            // ];
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
                partialTxn = await handleDeposit(
                    sdkServer,
                    txn,
                    partialTxn,
                    depositEvent
                );
            } else if (releaseEvent) {
                console.info(`Transaction ${txnID} is a release`);
                partialTxn = await handleRelease(
                    sdkServer,
                    txn,
                    partialTxn,
                    releaseEvent
                );
            } else if (refundEvent) {
                console.info(`Transaction ${txnID} is a refund`);
                partialTxn = await handleRefund(
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
}

async function handleDeposit(
    sdkServer: GlitterSDKServer,
    txn: ParsedTransactionWithMeta,
    partialTxn: PartialBridgeTxn,
    depositEvent: any
): Promise<PartialBridgeTxn> {
    //Set type
    partialTxn.txnType = TransactionType.Deposit;

    //Get token address
    const tokenAddress = depositEvent.data.mint.toBase58();

    //Check if addres is solana token address
    const isSolanaToken = tokenAddress === "11111111111111111111111111111111";

    //TODO: get token symbol from address
    //partialTxn.tokenSymbol = sdkServer.sdk.solana?.getSymbolFromAddress(tokenAddress) || "";

    return partialTxn;
}
async function handleRelease(
    sdkServer: GlitterSDKServer,
    txn: ParsedTransactionWithMeta,
    partialTxn: PartialBridgeTxn,
    releaseEvent: any
): Promise<PartialBridgeTxn> {
    return partialTxn;
}
async function handleRefund(
    sdkServer: GlitterSDKServer,
    txn: ParsedTransactionWithMeta,
    partialTxn: PartialBridgeTxn,
    refundEvent: any
): Promise<PartialBridgeTxn> {
    return partialTxn;
}
