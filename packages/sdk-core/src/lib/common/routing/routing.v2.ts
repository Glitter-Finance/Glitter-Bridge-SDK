import BigNumber from "bignumber.js";

/**
 * Represents a routing configuration for a transaction.
 *
 * @typedef {Object} Routing2
 * @property {Routing2Point} from - The source routing point.
 * @property {Routing2Point} to - The destination routing point.
 * @property {BigNumber} amount - The amount to be transferred.
 */
export type Routing2 = {
  from: Routing2Point;
  to: Routing2Point;
  amount: BigNumber;  
};

/**
 * Represents a routing point in a transaction routing configuration.
 *
 * @typedef {Object} Routing2Point
 * @property {string} network - The network of the routing point.
 * @property {string} local_symbol - The local symbol associated with the routing point.
 * @property {string} address - The address of the routing point.
 * @property {BigNumber} [base_units] - The value in base units associated with the routing point (optional).
 * @property {string} [txn_signature] - The transaction signature (optional).
 * @property {string} [txn_signature_hashed] - The hashed transaction signature (optional).
 */
export type Routing2Point = {
  network: string;
  local_symbol: string;
  address: string;
  base_units?: BigNumber;
  txn_signature?: string;
  txn_signature_hashed?: string;
};

/**
 * Creates a default routing configuration based on an existing routing configuration, if provided.
 *
 * @function RoutingDefault
 * @param {Routing2 | undefined} [copyFrom] - The existing routing configuration to copy from (optional).
 * @returns {Routing2} - The default routing configuration.
 */
export function RoutingDefault(
    copyFrom: Routing2 | undefined = undefined
): Routing2 {
    if (copyFrom) {
        return {
            from: RoutingPointDefault(copyFrom.from),
            to: RoutingPointDefault(copyFrom.to),
            amount: copyFrom.amount,
        };
    } else {
        return {
            from: RoutingPointDefault(),
            to: RoutingPointDefault(),
            amount: new BigNumber(0),
        };
    }
}

/**
 * Creates a default routing point based on an existing routing point, if provided.
 *
 * @function RoutingPointDefault
 * @param {Routing2Point | undefined} [copyFrom] - The existing routing point to copy from (optional).
 * @returns {Routing2Point} - The default routing point.
 */
export function RoutingPointDefault(
    copyFrom: Routing2Point | undefined = undefined
): Routing2Point {
    if (copyFrom) {
        return {
            network: copyFrom.network,
            address: copyFrom.address,
            local_symbol: copyFrom.local_symbol,
            base_units: copyFrom.base_units,
            txn_signature: copyFrom.txn_signature,
            txn_signature_hashed: copyFrom.txn_signature_hashed,
        };
    } else {
        return {
            network: "",
            address: "",
            local_symbol: "",
            base_units: new BigNumber(0),
            txn_signature: "",
            txn_signature_hashed: "",
        };
    }
}
/**
 * Converts a routing configuration to its string representation.
 *
 * @function RoutingString
 * @param {Routing2} routing - The routing configuration to convert.
 * @returns {string} - The string representation of the routing configuration.
 */
export function RoutingString(routing: Routing2): string {
    return JSON.stringify(routing, (key, value) =>
        typeof value === "bigint"
            ? value.toString()
            : JSON.stringify(value, (keyInner, valueInner) =>
                typeof valueInner === "bigint" ? valueInner.toString() : valueInner
            )
    );
}
