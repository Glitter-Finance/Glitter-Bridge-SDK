import { BridgeDepositEvent, BridgeNetworks, BridgeReleaseEvent, BridgeType, ChainStatus, PartialBridgeTxn, Routing, RoutingHelper, Sleep, TransactionType, TransferEvent, TronConnect, getHashedTransactionId } from "@glitter-finance/sdk-core/dist";
import { GlitterSDKServer } from "../../../glitterSDKServer";
import { ServerError } from "../../../lib/common";
import BigNumber from "bignumber.js";

export class TronCircleParser {

    public static async process(
        sdkServer: GlitterSDKServer,
        txnID: string,
        connect: TronConnect | undefined
    ): Promise<PartialBridgeTxn> {
        
        //Get Solana Transaction data
        const txnHashed = getHashedTransactionId(BridgeNetworks.TRON, txnID);
        let partialTxn: PartialBridgeTxn = {
            txnID: txnID,
            txnIDHashed: txnHashed,
            bridgeType: BridgeType.Circle,
            txnType: TransactionType.Unknown,
            network: BridgeNetworks.TRON,
            protocol: "Glitter Finance"
        };

        //Try to get txn details
        try {

            //get client
            if (!connect) throw ServerError.ClientNotSet(BridgeNetworks.TRON);

            //Get Status
            const provider = connect.tronWeb;

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

            //Get Gas
            partialTxn.gasPaid = txRec.ret[0].fee;

            //Get timestamp   
            const timestamp = new Date(txRec.raw_data.timestamp);
            partialTxn.txnTimestamp = timestamp;

            //Get block
            const txnInfo = await provider.trx.getTransactionInfo(txnID);
            partialTxn.block = txnInfo.blockNumber;

            //Check Deposit vs Release
            const depositAddress = sdkServer.sdk?.tron?.getTronAddress("depositWallet")?.toString();
            const releaseAddress = sdkServer.sdk?.tron?.getTronAddress("releaseWallet")?.toString();

            const to = transferDetail != null ? connect.tronWeb.address.fromHex((transferDetail as TransferEvent).to) : "";
            const from = transferDetail != null ? connect.tronWeb.address.fromHex((transferDetail as TransferEvent).from) : "";

            if (to.toLocaleLowerCase() === depositAddress?.toLocaleLowerCase() || 
                from.toLocaleLowerCase() === depositAddress?.toLocaleLowerCase()) {

                //Deposit
                console.info(`${partialTxn.txnID} is a deposit`);
                partialTxn.address = depositAddress;
                partialTxn = await handleDeposit(sdkServer, partialTxn, depositNote, transferDetail, releaseDetail, connect);
            } else if (to.toLocaleLowerCase() === releaseAddress?.toLocaleLowerCase() ||
                from.toLocaleLowerCase() === releaseAddress?.toLocaleLowerCase()) {
                
                //Release
                console.info(`${partialTxn.txnID} is a release`);
                partialTxn.address = releaseAddress;
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
    if (toAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getTronAddress("depositWallet")?.toString().toLocaleLowerCase()) {

        //transfer into deposit address
        partialTxn.txnType = TransactionType.Deposit;
        partialTxn.address = fromAddress;

    } else if (fromAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getTronAddress("depositWallet")?.toString().toLocaleLowerCase()) {

        //Transfer out of deposit address
        if (releaseDetails) {
            partialTxn.txnType = TransactionType.Refund;
            partialTxn.address = toAddress;
        } else {
            partialTxn.txnType = TransactionType.Transfer;
            partialTxn.address = toAddress;
        }
    }

    //get token:
    const tokenSymbol = "USDC";
    // if (connect.network == BridgeNetworks.Ethereum && events.deposit?.erc20Address?.toString() == "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c") {
    //     tokenSymbol = "EUROC";
    // } else if (connect.network == BridgeNetworks.Avalanche && events.deposit?.erc20Address?.toString() == "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD") {
    //     tokenSymbol = "EUROC";
    // }
    partialTxn.tokenSymbol = tokenSymbol;
    partialTxn.baseSymbol = tokenSymbol;

    //Get Routing
    if (partialTxn.txnType == TransactionType.Deposit) {
        const toNetwork = depositNote?.destination?.chain || "";
        toAddress = depositNote?.destination?.address || "";
        routing = {
            from: {
                network: BridgeNetworks.TRON,
                address: fromAddress || "",
                token: tokenSymbol,
                txn_signature: partialTxn.txnID,
            },
            to: {
                network: toNetwork,
                address: toAddress,
                token: tokenSymbol
            },
            amount: partialTxn.amount || undefined,
            units: partialTxn.units || undefined,
        };
    } else if (partialTxn.txnType == TransactionType.Refund) {
        routing = {
            from: {
                network: "",
                address: "",
                token: tokenSymbol,
                txn_signature_hashed: releaseDetails?.depositTransactionHash,
            },
            to: {
                network: BridgeNetworks.TRON,
                address: partialTxn.address || "",
                token: tokenSymbol,
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

    //get token:
    const tokenSymbol = "USDC";
    // if (connect.network == BridgeNetworks.Ethereum && events.deposit?.erc20Address?.toString() == "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c") {
    //     tokenSymbol = "EUROC";
    // } else if (connect.network == BridgeNetworks.Avalanche && events.deposit?.erc20Address?.toString() == "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD") {
    //     tokenSymbol = "EUROC";
    // }
    partialTxn.tokenSymbol = tokenSymbol;
    partialTxn.baseSymbol = tokenSymbol;

    //Check Type
    if (toAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getTronAddress("releaseWallet")?.toString().toLocaleLowerCase()) {

        //transfer into receiver address
        partialTxn.txnType = TransactionType.Transfer;
        partialTxn.address = fromAddress;

    } else if (fromAddress.toLocaleLowerCase() == sdkServer.sdk?.tron?.getTronAddress("releaseWallet")?.toString().toLocaleLowerCase()) {

        //Transfer out of receiver address
        partialTxn.txnType = TransactionType.Release;
        partialTxn.address = toAddress;

        //Get Routing
        routing = {
            from: {
                network: "",
                address: "",
                token: tokenSymbol,
                txn_signature_hashed: releaseDetails?.depositTransactionHash,
            },
            to: {
                network: BridgeNetworks.TRON,
                address: partialTxn.address || "",
                token: tokenSymbol,
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