import BigNumber from "bignumber.js";
import { BridgeTokenConfig } from "../tokens";

/**
 * Represents a routing configuration for a transaction.
 *
 * @typedef {Object} Routing
 * @property {RoutingPoint} from - The source routing point.
 * @property {RoutingPoint} to - The destination routing point.
 * @property {BigNumber} amount - The amount to be transferred.
 * @property {BigNumber} units - The units of the amount.
 */
export type Routing = {
  from: RoutingPoint;
  to: RoutingPoint;
  amount: BigNumber;
  units: BigNumber;
};

/**
 * Represents a routing point in a transaction routing configuration.
 *
 * @typedef {Object} RoutingPoint
 * @property {string} network - The network of the routing point.
 * @property {string} address - The address of the routing point.
 * @property {string} token - The token associated with the routing point.
 * @property {string} [txn_signature] - The transaction signature (optional).
 * @property {string} [txn_signature_hashed] - The hashed transaction signature (optional).
 */
export type RoutingPoint = {
  network: string;
  address: string;
  token: string;
  txn_signature?: string;
  txn_signature_hashed?: string;
};

/**
 * Represents a deposit note.
 *
 * @typedef {Object} DepositNote
 * @property {string} system - The system associated with the deposit note.
 * @property {string} date - The date of the deposit note.
 */
export type DepositNote = {
  system: string;
  date: string;
};

/**
 * Creates a default routing configuration based on an existing routing configuration, if provided.
 *
 * @function RoutingDefault
 * @param {Routing | undefined} [copyFrom] - The existing routing configuration to copy from (optional).
 * @returns {Routing} - The default routing configuration.
 */
export function RoutingDefault(
    copyFrom: Routing | undefined = undefined
): Routing {
    if (copyFrom) {
        return {
            from: RoutingPointDefault(copyFrom.from),
            to: RoutingPointDefault(copyFrom.to),
            amount: copyFrom.amount,
            units: copyFrom.units,
        };
    } else {
        return {
            from: RoutingPointDefault(),
            to: RoutingPointDefault(),
            amount: new BigNumber(0),
            units: new BigNumber(0),
        };
    }
}

/**
 * Creates a default routing point based on an existing routing point, if provided.
 *
 * @function RoutingPointDefault
 * @param {RoutingPoint | undefined} [copyFrom] - The existing routing point to copy from (optional).
 * @returns {RoutingPoint} - The default routing point.
 */
export function RoutingPointDefault(
    copyFrom: RoutingPoint | undefined = undefined
): RoutingPoint {
    if (copyFrom) {
        return {
            network: copyFrom.network,
            address: copyFrom.address,
            token: copyFrom.token,
            txn_signature: copyFrom.txn_signature,
        };
    } else {
        return {
            network: "",
            address: "",
            token: "",
            txn_signature: "",
        };
    }
}

/**
 * Converts a routing configuration to its string representation.
 *
 * @function RoutingString
 * @param {Routing} routing - The routing configuration to convert.
 * @returns {string} - The string representation of the routing configuration.
 */
export function RoutingString(routing: Routing): string {
    return JSON.stringify(routing, (key, value) =>
        typeof value === "bigint"
            ? value.toString()
            : JSON.stringify(value, (keyInner, valueInner) =>
                typeof valueInner === "bigint" ? valueInner.toString() : valueInner
            )
    );
}

/**
 * Sets the units of a routing configuration based on the specified token configuration.
 *
 * @function SetRoutingUnits
 * @param {Routing} routing - The routing configuration to modify.
 * @param {BridgeTokenConfig | undefined} token - The token configuration to retrieve the units from (optional).
 * @returns {void}
 */
export function SetRoutingUnits(
    routing: Routing,
    token: BridgeTokenConfig | undefined
) {
    if (!token) throw new Error("Token not defined");
    if (routing.units) return;
    if (!routing.amount) throw new Error("Routing amount not defined");
    if (token.decimals == undefined)
        throw new Error("Routing decimals not defined");
    routing.units = BigNumber(routing.amount).times(
        BigNumber(10).pow(token.decimals)
    ); //ValueUnits.fromValue(routing.amount, token.decimals).units.toString();
}

/**
 * Represents a class that provides helper methods for routing configurations.
 *
 * @class RoutingHelper
 */
export class RoutingHelper {

    /**
     * Converts a value from its readable representation to base units based on the specified decimals.
     *
     * @static
     * @function BaseUnits_FromReadableValue
     * @param {number | BigNumber} value - The value to convert.
     * @param {number} decimals - The number of decimal places for the base units.
     * @returns {BigNumber} - The value in base units.
     */
    public static BaseUnits_FromReadableValue(
        value: number | BigNumber,
        decimals: number
    ): BigNumber {
        const baseRaw = BigNumber(value).times(BigNumber(10).pow(decimals));
        return baseRaw.decimalPlaces(0, BigNumber.ROUND_DOWN);
    }

    /**
     * Converts a value from its base units representation to a readable value based on the specified decimals.
     *
     * @static
     * @function ReadableValue_FromBaseUnits
     * @param {BigNumber} baseUnits - The value in base units to convert.
     * @param {number} decimals - The number of decimal places for the base units.
     * @returns {BigNumber} - The value in its readable representation.
     */
    public static ReadableValue_FromBaseUnits(
        baseUnits: BigNumber,
        decimals: number
    ): BigNumber {
        const baseRaw = BigNumber(baseUnits).div(BigNumber(10).pow(decimals));
        return baseRaw;
    }

    /**
     * Shifts the decimal places of a value in base units from the original decimals to the new decimals.
     *
     * @static
     * @function BaseUnits_Shift
     * @param {BigNumber} original_base_units - The value in base units with the original decimals.
     * @param {number} original_decimals - The original number of decimal places for the base units.
     * @param {number} new_decimals - The new number of decimal places for the base units.
     * @returns {BigNumber} - The value in base units with the new decimals.
     */
    public static BaseUnits_Shift(
        original_base_units: BigNumber,
        original_decimals: number,
        new_decimals: number
    ): BigNumber {
        const baseRaw = BigNumber(original_base_units)
            .times(BigNumber(10).pow(new_decimals))
            .div(BigNumber(10).pow(original_decimals));
        return baseRaw.decimalPlaces(0, BigNumber.ROUND_DOWN);
    }
}
