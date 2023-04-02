export class BridgeInitSchema {
    readonly algo_address: Uint8Array;
    readonly amount: number;
    constructor(properties: { algo_address: Uint8Array; amount: number }) {
        this.algo_address = properties.algo_address;
        this.amount = properties.amount;
    }

    static init_schema = new Map([
        [
            BridgeInitSchema,
            {
                kind: "struct",
                fields: [
                    ["algo_address", [32]],
                    ["amount", "u64"],
                ],
            },
        ],
    ]);
}
export class BridgeSetSchema {
    readonly validator_address: Uint8Array;

    constructor(properties: { validator_address: Uint8Array }) {
        this.validator_address = properties.validator_address;
    }

    static set_schema = new Map([
        [
            BridgeSetSchema,
            {
                kind: "struct",
                fields: [["validator_address", [32]]],
            },
        ],
    ]);
}

export class BridgeReleaseSchema {
    readonly algo_address: Uint8Array;
    readonly algo_txn_id: Uint8Array;
    readonly amount: number;

    constructor(properties: { algo_address: Uint8Array; algo_txn_id: Uint8Array; amount: number }) {
        this.algo_address = properties.algo_address;
        this.algo_txn_id = properties.algo_txn_id;
        this.amount = properties.amount;
    }

    static release_schema = new Map([
        [
            BridgeReleaseSchema,
            {
                kind: "struct",
                fields: [
                    ["algo_address", [32]],
                    ["algo_txn_id", [52]],
                    ["amount", "u64"],
                ],
            },
        ],
    ]);
}
export class BridgeApproveSchema {
    readonly algo_address: Uint8Array;
    readonly algo_txn_id: Uint8Array;

    constructor(properties: { algo_address: Uint8Array; algo_txn_id: Uint8Array }) {
        this.algo_address = properties.algo_address;
        this.algo_txn_id = properties.algo_txn_id;
    }

    static approve_schema = new Map([
        [
            BridgeApproveSchema,
            {
                kind: "struct",
                fields: [
                    ["algo_address", [32]],
                    ["algo_txn_id", [52]],
                ],
            },
        ],
    ]);
}
export class BridgeCancelSchema {
    readonly algo_address: Uint8Array;

    constructor(properties: { algo_address: Uint8Array }) {
        this.algo_address = properties.algo_address;
    }

    static cancel_schema = new Map([
        [
            BridgeCancelSchema,
            {
                kind: "struct",
                fields: [["algo_address", [32]]],
            },
        ],
    ]);
}
