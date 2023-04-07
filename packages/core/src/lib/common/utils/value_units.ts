import {PreciseDecimals} from "./utils";

/**
 * @deprecated The method should not be used. Please use RoutingHelper instead
 */
export class ValueUnits {
    public value = 0;
    public units = BigInt(0);

    public static fromValue(value: number, decimals: number): ValueUnits {
        {
            const returnValue = new ValueUnits();
            returnValue.value = value;

            //Note precise is used to avoid floating point errors
            returnValue.units = BigInt(
                PreciseDecimals(value * Math.pow(10, decimals), 0)
            );
            return returnValue;
        }
    }
    public static fromUnits(units: bigint, decimals: number): ValueUnits {
        {
            const returnValue = new ValueUnits();
            returnValue.units = units;

            const x = units.toString().padStart(decimals, "0");
            const position = x.length - decimals;
            const output = [x.slice(0, position), ".", x.slice(position)].join("");
            returnValue.value = Number(output);

            return returnValue;
        }
    }
}

// using BigNumber.js
// e.g 1 => 1000000 USDC
// export function toTokenUnits(
//   amount: string | number | BigNumber,
//   decimals: number
// ): BigNumber {
//   const decimals = new BigNumber(10).pow(decimals);
//   return new BigNumber(amount).times(decimals);
// }
// e.g 1000000 => 1 USDC
// export function fromTokenUnits(
//   amount: string | number | BigNumber,
//   decimals: number
// ): BigNumber {
//   const decimals = new BigNumber(10).pow(decimals);
//   return new BigNumber(amount).div(decimals);
// }
