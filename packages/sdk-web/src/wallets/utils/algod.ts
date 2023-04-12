import type _algosdk from "algosdk";
import {
    DEFAULT_NODE_BASEURL,
    DEFAULT_NODE_TOKEN,
    DEFAULT_NODE_PORT,
} from "./constants";

export const getAlgosdk = async () => {
    return (await import("algosdk")).default;
};

export const getAlgodClient = async (
    algosdk: typeof _algosdk,
    algodClientOptions?: any
) => {
    const [
        tokenOrBaseClient = DEFAULT_NODE_TOKEN,
        baseServer = DEFAULT_NODE_BASEURL,
        port = DEFAULT_NODE_PORT,
        headers,
    ] = algodClientOptions || [];

    return new algosdk.Algodv2(tokenOrBaseClient, baseServer, port, headers);
};

export default class Algod {
    algosdk: typeof _algosdk;
    algodClient: _algosdk.Algodv2;

    constructor(algosdk: typeof _algosdk, algodClient: _algosdk.Algodv2) {
        this.algosdk = algosdk;
        this.algodClient = algodClient;
    }

    static async init(algodOptions?: any) {
        const algosdk = await getAlgosdk();
        const algodClient = await getAlgodClient(algosdk, algodOptions);

        return new Algod(algosdk, algodClient);
    }
}