import { BridgeDepositEvent, BridgeNetworks, BridgeReleaseEvent, BridgeType, ChainStatus, PartialBridgeTxn, Routing, RoutingHelper, Sleep, TransactionType, TransferEvent, TronConnect, getHashedTransactionId } from "@glitter-finance/sdk-core/dist";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { Cursor, ServerError } from "../../../lib/common";
import BigNumber from "bignumber.js";

export class TronCircleParser {

    public static async process(
        sdkServer: GlitterSDKServer,
        txnID: string,
        connect: TronConnect | undefined,
        cursor: Cursor
    ): Promise<PartialBridgeTxn> {
        
        //Destructure Local Vars
        const address = cursor.address.toString();

        //Get Solana Transaction data
        const txnHashed = getHashedTransactionId(BridgeNetworks.TRON, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.Circle,
            txnType: TransactionType.Unknown,
            network: BridgeNetworks.TRON,
            address: address,
        };

        //Try to get txn details
        try {

            //get client
            if (!connect) throw ServerError.ClientNotSet(BridgeNetworks.TRON);

            //Get Status
            const provider = connect.tronWeb;
            const { TRONGRID_API } = process.env;

            //Get Bridge Logs
            let details: (TransferEvent | BridgeDepositEvent | BridgeReleaseEvent)[] = [];
            for (let i = 0; i < 10; i++) {
                details = await connect.getBridgeLogs(txnID);
                if (details.length > 0) {
                    break;
                }
                await Sleep(250);
            }
            if (!details || details.length == 0) {
                partialTxn.chainStatus = ChainStatus.Pending;
                partialTxn.txnType = TransactionType.Error;
                console.warn(`Transaction ${txnID} has no logs`);
                return Promise.resolve(partialTxn);
            }

            //Get Deposit Info
            const depositNote = await connect.deSerializeDepositEvent(txnID)

            //Get Release Info
            let transferDetail: TransferEvent | null = null;
            let releaseDetail: BridgeReleaseEvent | null = null;
            details.forEach((detail) => {
                if (detail.__type === "BridgeRelease") {
                    releaseDetail = detail;
                } else if (detail.__type === "Transfer") {
                    transferDetail = detail;
                }
            });

            const txRec = await provider.trx.getTransaction(
                partialTxn.txnID
            );
            const status = txRec.ret[0].contractRet;
            if (status === "SUCCESS") {
                partialTxn.chainStatus = ChainStatus.Completed;
            } else if (status === "UNCONFIRMED") {
                partialTxn.chainStatus = ChainStatus.Pending;
                partialTxn.txnType = TransactionType.Error;
                return Promise.resolve(partialTxn);
            } else {
                partialTxn.chainStatus = ChainStatus.Unknown;
            }

            //Get timestamp   
            const timestamp = new Date(txRec.raw_data.timestamp);
            partialTxn.txnTimestamp = timestamp;

            //Get block
            const txnInfo = await provider.trx.getTransactionInfo(txnID);
            partialTxn.block = txnInfo.blockNumber;

            //Check deposit vs release   
            if (address && address === sdkServer.sdk?.tron?.getAddress("depositWallet")?.toString()) {
                console.info(`${partialTxn.txnID} is a deposit`);
                partialTxn = await handleDeposit(sdkServer, partialTxn, depositNote, transferDetail, releaseDetail, connect);
            } else if (address && address === sdkServer.sdk?.tron?.getAddress("releaseWallet")?.toString()) {
                console.info(`${partialTxn.txnID} is a release`);
                partialTxn = await handleRelease(sdkServer, partialTxn, releaseDetail, transferDetail, connect);
            } else {
                partialTxn.txnType = TransactionType.Error;
                console.info(`${partialTxn.txnID} is unknown`);
                return Promise.resolve(partialTxn);
            }
        
        } catch (e) {
            partialTxn.txnType = TransactionType.Error;
            console.error(`Transaction ${txnID} failed to parse`);
            console.error(e);
        }

        return partialTxn;
    }
}

//Deposit
async function handleDeposit(
    sdkServer: GlitterSDKServer,
    partialTxn: PartialBridgeTxn,
    depositNote: {
        destination: {
            chain: BridgeNetworks;
            address: string;
        };
        amount: string;
    } | null,
    transferDetail: TransferEvent | null,
    releaseDetails: BridgeReleaseEvent | null,
    connect: TronConnect
): Promise<PartialBridgeTxn> {

    const decimals = 6;

    //Get Addresses
    let toAddress = "";
    if (transferDetail) toAddress = connect.tronWeb.address.fromHex(transferDetail.to);
    let fromAddress = "";
    if (transferDetail) fromAddress = connect.tronWeb.address.fromHex(transferDetail.from);

    let units = BigNumber(0);
    if (transferDetail) units = BigNumber(transferDetail.value.toString());
    const amount = RoutingHelper.ReadableValue_FromBaseUnits(units, decimals);

    partialTxn.amount = amount;
    partialTxn.units = units;

    //Get Routing
    let routing: Routing | null = null;

    //Check Type
    if (toAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getAddress("depositWallet")?.toString().toLocaleLowerCase()) {

        //transfer into deposit address
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.address = fromAddress;

    } else if (fromAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getAddress("depositWallet")?.toString().toLocaleLowerCase()) {

        //Transfer out of deposit address
        if (releaseDetails) {
            partialTxn.txnType = TransactionType.Refund;
            partialTxn.address = toAddress;
        } else {
            partialTxn.txnType = TransactionType.Transfer;
            partialTxn.address = toAddress;
        }
    }

    //Get Routing
    if (partialTxn.txnType == TransactionType.Deposit) {
        const toNetwork = depositNote?.destination?.chain || "";
        toAddress = depositNote?.destination?.address || "";
        routing = {
            from: {
                network: BridgeNetworks.TRON,
                address: fromAddress || "",
                token: "usdc",
                txn_signature: partialTxn.txnID,
            },
            to: {
                network: toNetwork,
                address: toAddress,
                token: "usdc"
            },
            amount: partialTxn.amount || undefined,
            units: partialTxn.units || undefined,
        };
    } else if (partialTxn.txnType == TransactionType.Refund) {
        routing = {
            from: {
                network: "",
                address: "",
                token: "usdc",
                txn_signature_hashed: releaseDetails?.depositTransactionHash,
            },
            to: {
                network: BridgeNetworks.TRON,
                address: partialTxn.address || "",
                token: "usdc",
                txn_signature: partialTxn.txnID,
            },
            amount: partialTxn.amount || undefined,
            units: partialTxn.units || undefined,
        };
    }

    //Set routing
    partialTxn.routing = routing;

    return Promise.resolve(partialTxn);
}

//Release
async function handleRelease(
    sdkServer: GlitterSDKServer,
    partialTxn: PartialBridgeTxn,
    releaseDetails: BridgeReleaseEvent | null,
    transferDetail: TransferEvent | null,
    connect: TronConnect
): Promise<PartialBridgeTxn> {

    const decimals = 6;

    //Get Addresses
    let toAddress = "";
    if (transferDetail) toAddress = connect.tronWeb.address.fromHex(transferDetail.to);
    let fromAddress = "";
    if (transferDetail) fromAddress = connect.tronWeb.address.fromHex(transferDetail.from);

    let units = BigNumber(0);
    if (transferDetail) units = BigNumber(transferDetail.value.toString());
    const amount = RoutingHelper.ReadableValue_FromBaseUnits(units, decimals);

    partialTxn.amount = amount;
    partialTxn.units = units;

    //Get Routing
    let routing: Routing | null = null;

    //Check Type
    if (toAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getAddress("releaseWallet")?.toString().toLocaleLowerCase()) {

        //transfer into receiver address
        partialTxn.txnType = TransactionType.Transfer;
        partialTxn.address = fromAddress;

    } else if (fromAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getAddress("releaseWallet")?.toString().toLocaleLowerCase()) {

        //Transfer out of receiver address
        partialTxn.txnType = TransactionType.Release;
        partialTxn.address = toAddress;

        //Get Routing
        routing = {
            from: {
                network: "",
                address: "",
                token: "usdc",
                txn_signature_hashed: releaseDetails?.depositTransactionHash,
            },
            to: {
                network: BridgeNetworks.TRON,
                address: partialTxn.address || "",
                token: "usdc",
                txn_signature: partialTxn.txnID,
            },
            amount: partialTxn.amount || undefined,
            units: partialTxn.units || undefined,
        };
    }

    //Set routing
    partialTxn.routing = routing;

    return Promise.resolve(partialTxn);
}