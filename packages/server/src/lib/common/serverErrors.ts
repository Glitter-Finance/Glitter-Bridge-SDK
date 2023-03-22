import { BridgeNetworks } from "@glitter-finance/sdk-core";

export class ServerError {
    static ClientNotSet(network: BridgeNetworks): Error {
        return new Error(`The client for ${network} has not been set`);
    }
    static CursorNotSet(network: BridgeNetworks): Error {
        return new Error(`The cursor for ${network} has not been set`);
    }
    static TxnNotFound(network: BridgeNetworks, txn: string, e?: any): Error {
        return new Error(`The transaction ${txn} was not found on ${network}: ${e?.message}`);
    }
    static ProcessingError(network: BridgeNetworks, txn: string, e?: any): Error {
        return new Error(`The transaction ${txn} could not be processed on ${network}: ${e?.message}`);
    }
    static InvalidBridgeType(network: BridgeNetworks, type: string): Error {
        return new Error(`The bridge type ${type} is not valid for ${network}`);
    }
    static PollerNotSet(): Error {
        return new Error(`The poller has not been set`);
    }
    static NetworkNotSet(): Error {
        return new Error(`The network has not been set`);
    }
}
