import BigNumber from "bignumber.js";
import { BridgeTokenConfig } from "../tokens";

export type Routing2 = {
  from: Routing2Point;
  to: Routing2Point;
  amount: BigNumber;  
};
export type Routing2Point = {
  network: string;
  local_symbol: string;
  address: string;
  base_units?: BigNumber;
  txn_signature?: string;
  txn_signature_hashed?: string;
};

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

export function RoutingString(routing: Routing2): string {
    return JSON.stringify(routing, (key, value) =>
        typeof value === "bigint"
            ? value.toString()
            : JSON.stringify(value, (keyInner, valueInner) =>
                typeof valueInner === "bigint" ? valueInner.toString() : valueInner
            )
    );
}
