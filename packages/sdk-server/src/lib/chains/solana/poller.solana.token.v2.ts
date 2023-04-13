import {
    Connection,
    ParsedInstruction,
    ParsedTransactionWithMeta,
    PartiallyDecodedInstruction,
    PublicKey,
} from "@solana/web3.js";
import {PartialBridgeTxn} from "@glitter-finance/sdk-core";
import {GlitterSDKServer} from "../../glitterSDKServer";
import util from "util";
import bs58 from "bs58";

import * as anchor from "@project-serum/anchor";
import {deserialize} from "borsh";
import * as borsh from "borsh";
import BigNumber from "bignumber.js";

export class RoutingInfoSchema {
    readonly address: Uint8Array;
    readonly network: string;

    constructor(properties: { address: Uint8Array; network: string }) {
        this.address = properties.address;
        this.network = properties.network;
    }

    static init_schema = new Map([
        [
            RoutingInfoSchema,
            {
                kind: "struct",
                fields: [
                    ["address", [32]],
                    ["network", "string"],
                ],
            },
        ],
    ]);
}

export class DepositEventSchema {
    readonly amount: number;
    readonly units: BigNumber;
    readonly mint: PublicKey;
    readonly from: RoutingInfoSchema;
    readonly to: RoutingInfoSchema;

    constructor(properties: {
    amount: number;
    units: BigNumber;
    mint: PublicKey;
    from: RoutingInfoSchema;
    to: RoutingInfoSchema;
  }) {
        this.to = properties.to;
        this.from = properties.from;
        this.mint = properties.mint;
        this.units = properties.units;
        this.amount = properties.amount;
    }

    static deposit_schema = new Map([
        [
            DepositEventSchema,
            {
                kind: "struct",
                fields: [
                    ["amount", "f64"],
                    ["units", "u64"],
                    ["mint", "publicKey"],
                    ["from", RoutingInfoSchema],
                    ["to", RoutingInfoSchema],
                ],
            },
        ],
    ]);
}

export class SolanaV2Parser {
    public static async process(
        sdkServer: GlitterSDKServer,
        client: Connection | undefined,
        txn: ParsedTransactionWithMeta
    ): Promise<PartialBridgeTxn> {
        try {
            const txnData = (
        txn.transaction.message.instructions[0] as PartiallyDecodedInstruction
            ).data;
            const data_bytes = bs58.decode(txnData);
            console.log(
                util.inspect(data_bytes, false, null, true /* enable colors */)
            );

            //Deserialize Instructions
            const instruction = deserialize(
                DepositEventSchema.deposit_schema,
                DepositEventSchema,
                Buffer.from(data_bytes.slice(0))
            );
            console.log(
                util.inspect(instruction, false, null, true /* enable colors */)
            );
        } catch (e) {
            console.error(e);
        }

        throw new Error("Method not implemented.");
    }
}
