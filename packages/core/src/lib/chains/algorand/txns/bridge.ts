import algosdk, { Transaction, Algodv2 } from "algosdk";
import { AlgorandTxns } from "./txns";
import * as util from "util";
import { BridgeToken, BridgeTokens, Routing, RoutingDefault, RoutingString, SetRoutingUnits } from "../../../common";
import { AlgorandAccountsConfig, AlgorandProgramAccount } from "../config";
import { RoutingHelper } from "../../../common/routing/routing";
import BigNumber from "bignumber.js";

export enum AlgorandBridgeTxnType {
    none,
    token_vault_setup = "token_vault_setup",
    token_vault_update_fee = "token_vault_update_fee",
    token_vault_update_limits = "token_vault_update_limits",
    token_vault_deposit = "token_vault_deposit",
    token_vault_release = "token_vault_release",
    token_vault_refund = "token_vault_refund",
    token_vault_optin = "token_vault_optin",
    xsol_release = "xSOL-release",
    algo_release = "algo-release",
    xsol_deposit = "xSOL-deposit",
    algo_deposit = "algo-deposit",
    xsol_refund = "xSOL-refund",
    algo_refund = "algo-refund",
    usdc_deposit = "usdc-deposit",
}

export class AlgorandBridgeTxnsV1 {
    private _bridgeApprovalAppId = 0;
    private _client: Algodv2 | undefined = undefined;
    private _transactions: AlgorandTxns | undefined = undefined;
    private _accounts: AlgorandAccountsConfig | undefined = undefined;

    //constructor
    public constructor(
        algoClient: Algodv2,
        appId: number,
        transactions: AlgorandTxns,
        accounts: AlgorandAccountsConfig
    ) {
        this._client = algoClient;
        this._bridgeApprovalAppId = appId;
        this._transactions = transactions;
        this._accounts = accounts;
    }

    public appArgs(functionName: AlgorandBridgeTxnType): Uint8Array[] | undefined;
    public appArgs(functionName: AlgorandBridgeTxnType, routing: Routing): Uint8Array[] | undefined;
    public appArgs(functionName: AlgorandBridgeTxnType, routing: Routing, token: BridgeToken): Uint8Array[] | undefined;
    public appArgs(
        functionName: AlgorandBridgeTxnType,
        routing?: Routing,
        token?: BridgeToken
    ): Uint8Array[] | undefined {
        const appArgs: Uint8Array[] = [];
        let solana_asset = "";
        let app_asset_type = "";

        switch (functionName) {
            case AlgorandBridgeTxnType.token_vault_setup:
            case AlgorandBridgeTxnType.token_vault_update_fee:
            case AlgorandBridgeTxnType.token_vault_update_limits:
            case AlgorandBridgeTxnType.token_vault_optin:
                //Fail Safe
                if (!token) throw new Error("Token Config is required");
                {
                    appArgs.push(new Uint8Array(Buffer.from(AlgorandBridgeTxnType[functionName]))); //0
                    appArgs.push(algosdk.encodeUint64(Number(token.address))); //1
                    appArgs.push(new Uint8Array(Buffer.from(token.symbol))); //2
                    appArgs.push(algosdk.encodeUint64(Number(token.decimals))); //3
                    appArgs.push(algosdk.encodeUint64(Number(token.fee_divisor))); //4

                    const min_transfer = token.min_transfer ? token.min_transfer : 0;
                    appArgs.push(algosdk.encodeUint64(Number(min_transfer * Math.pow(10, token.decimals)))); //5
                    const max_transfer = token.max_transfer ? token.max_transfer : 0;
                    appArgs.push(algosdk.encodeUint64(Number(max_transfer * Math.pow(10, token.decimals)))); //6
                }
                break;

            case AlgorandBridgeTxnType.xsol_deposit:
            case AlgorandBridgeTxnType.algo_deposit:
                //Fail Safe
                if (!routing) throw new Error("Bridge Transaction is required");
                if (routing.to.network.toLowerCase() != "solana") throw new Error("to network is not solana");
                if (routing.from.network.toLowerCase() != "algorand") throw new Error("from network is not algorand");

                //Get Integer Amount
                {
                    if (!token) throw new Error("Token Config is required");
                    if (!routing.units) SetRoutingUnits(routing, token);

                    //Set Solana Asset
                    if (functionName == AlgorandBridgeTxnType.xsol_deposit) {
                        solana_asset = "sol";
                        app_asset_type = "xSOL";
                    } else if (functionName == AlgorandBridgeTxnType.algo_deposit) {
                        solana_asset = "xALGoH1zUfRmpCriy94qbfoMXHtK6NDnMKzT4Xdvgms";
                        app_asset_type = "algo";
                    }

                    //Set routing units
                    if (routing.units) {
                        const local_token = BridgeTokens.get("algorand", app_asset_type);
                        SetRoutingUnits(routing, local_token);
                    }

                    appArgs.push(new Uint8Array(Buffer.from(routing.to.address))); //0 (Solana Address)
                    appArgs.push(new Uint8Array(Buffer.from(routing.from.address))); //1 (Algorand Address)
                    appArgs.push(new Uint8Array(Buffer.from(solana_asset))); //2 (Solana Asset)
                    appArgs.push(new Uint8Array(Buffer.from(app_asset_type))); //3 (Algorand Asset)
                    appArgs.push(new Uint8Array(Buffer.from(functionName.toString()))); //4 (App Call)
                    appArgs.push(new Uint8Array(Buffer.from(routing.to.txn_signature || ""))); //5 (Solana Signature)
                    appArgs.push(algosdk.encodeUint64(Number(routing.units))); //6 (Amount)
                }
                break;

            case AlgorandBridgeTxnType.xsol_release:
            case AlgorandBridgeTxnType.algo_release:
            case AlgorandBridgeTxnType.xsol_refund:
            case AlgorandBridgeTxnType.algo_refund:
                //Fail Safe
                if (!routing) throw new Error("Bridge Transaction is required");
                if (routing.from.network.toLowerCase() != "solana") throw new Error("from network is not solana");
                if (routing.to.network.toLowerCase() != "algorand") throw new Error("to network is not algorand");

                //Get Integer Amount
                if (!token) throw new Error("Token Config is required");
                {
                    if (!routing.units) SetRoutingUnits(routing, token);

                    //Set Solana Asset
                    if (
                        functionName == AlgorandBridgeTxnType.xsol_release ||
                        functionName == AlgorandBridgeTxnType.xsol_refund
                    ) {
                        solana_asset = "sol";
                        app_asset_type = "xSOL";
                    } else if (
                        functionName == AlgorandBridgeTxnType.algo_release ||
                        functionName == AlgorandBridgeTxnType.algo_refund
                    ) {
                        solana_asset = "xALGoH1zUfRmpCriy94qbfoMXHtK6NDnMKzT4Xdvgms";
                        app_asset_type = "algo";
                    }

                    //Set routing units
                    if (routing.units) {
                        const local_token = BridgeTokens.get("algorand", app_asset_type);
                        SetRoutingUnits(routing, local_token);
                    }

                    appArgs.push(new Uint8Array(Buffer.from(routing.from.address))); //0 (Solana Address)
                    appArgs.push(new Uint8Array(Buffer.from(routing.to.address))); //1 (Algorand Address)
                    appArgs.push(new Uint8Array(Buffer.from(solana_asset))); //2 (Solana Asset)
                    appArgs.push(new Uint8Array(Buffer.from(app_asset_type))); //3 (Algorand Asset)
                    appArgs.push(new Uint8Array(Buffer.from(functionName.toString()))); //4 (App Call)
                    appArgs.push(new Uint8Array(Buffer.from(routing.to.txn_signature || ""))); //5 (Solana Signature)
                    appArgs.push(algosdk.encodeUint64(Number(routing.units))); //6 (Amount)
                }
                break;

            case AlgorandBridgeTxnType.token_vault_deposit:
            case AlgorandBridgeTxnType.token_vault_release:
            case AlgorandBridgeTxnType.token_vault_refund:
                //Fail Safe
                if (!routing) throw new Error("Bridge Transaction is required");
                if (!token) throw new Error("Token Config is required");

                {
                    let from_signature = "null";
                    if (routing.from.txn_signature) from_signature = routing.from.txn_signature;

                    //console.log(JSON.stringify(routing));
                    let from_pk: Uint8Array = new Uint8Array();
                    if (routing.from.address && routing.from.network.toLocaleLowerCase() === "algorand")
                        from_pk = algosdk.decodeAddress(routing.from.address).publicKey;
                    let to_pk: Uint8Array = new Uint8Array();
                    if (routing.to.address && routing.to.network.toLocaleLowerCase() === "algorand")
                        to_pk = algosdk.decodeAddress(routing.to.address).publicKey;

                    //Set routing units
                    if (routing.units) {
                        SetRoutingUnits(routing, token);
                    }

                    appArgs.push(new Uint8Array(Buffer.from(AlgorandBridgeTxnType[functionName]))); //0
                    appArgs.push(new Uint8Array(Buffer.from(routing.from.network))); //1
                    appArgs.push(new Uint8Array(Buffer.from(routing.from.address))); //2
                    appArgs.push(from_pk); //3
                    appArgs.push(new Uint8Array(Buffer.from(from_signature))); //4
                    appArgs.push(new Uint8Array(Buffer.from(routing.to.network))); //5
                    appArgs.push(new Uint8Array(Buffer.from(routing.to.address))); //6
                    appArgs.push(to_pk); //7
                    appArgs.push(algosdk.encodeUint64(Number(routing.units))); //8
                }

                break;

            default:
                return undefined;
        }
        return appArgs;
    }

    public async HandleUsdcSwap(routing: Routing): Promise<algosdk.Transaction[]> {
        if (!routing) throw new Error("Bridge Transaction is required");
        if (!routing.from.address) throw new Error("source is not defined");
        if (!routing.to.address) throw new Error("destination is not defined");
        if (!routing.amount) {
            throw new Error("amount can not be null");
        }

        if (routing.amount < BigNumber(1)) {
            throw new Error("Minimum Deposit Amount should be >= 1");
        }

        //Fail Safe
        if (!this._client) throw new Error("Algorand Client is required");
        if (!routing) throw new Error("Bridge Transaction is required");

        //Get Token
        const token = await BridgeTokens.get("algorand", routing.from.token);
        if (!token) throw new Error("Token Config is required"); // USDC bridge token is not added in SDK

        if (!routing.amount) throw new Error("Routing Amount is required");
        if (!this._transactions) throw new Error("Algorand Transactions is required");

        const amount_nanoUsdc = RoutingHelper.BaseUnits_FromReadableValue(routing.amount, token.decimals);

        const routingData: Routing = {
            from: {
                token: "USDC",
                network: "algorand",
                address: routing.from.address,
                txn_signature: "",
            },
            to: {
                token: "USDC",
                network: "solana",
                address: routing.to.address,
                txn_signature: "",
            },
            amount: routing.amount,
            units: amount_nanoUsdc,
        };

        const txn = this._transactions.initAlgorandUSDCTokenBridge(routingData, token);
        return txn;
    }

    public async bridgeTransactions(routing: Routing, token: BridgeToken): Promise<algosdk.Transaction[]> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!routing) throw new Error("Bridge Transaction is required");
                if (!token) throw new Error("Token Config is required");
                if (!this.ValidateSendRouting(routing)) throw new Error("Invalid Routing");

                //Set up Transactions
                // algorand wallet algo|xsol|usdc
                let fn = AlgorandBridgeTxnType.none;
                if (token.symbol.toLowerCase() === "algo") {
                    fn = AlgorandBridgeTxnType.algo_deposit;
                } else if (token.symbol.toLowerCase() === "xsol") {
                    fn = AlgorandBridgeTxnType.xsol_deposit;
                }

                const appTxn = await this.BridgeApprovalTransaction(fn, routing, token);
                const feeTxn = await this.BridgeFeeTransaction(routing);
                const depositTxn = await this.BridgeDepositTransaction(routing);
                const transactions = [appTxn, feeTxn, depositTxn];

                resolve(transactions);
            } catch (error) {
                reject(error);
            }
        });
    }

    public ValidateSendRouting(routing: Routing): boolean {
        const fNetwork = routing.from.network.toLowerCase();
        const fToken = routing.from.token.toLowerCase();
        const tNetwork = routing.to.network.toLowerCase();
        const tToken = routing.to.token.toLowerCase();

        if (fNetwork == "algorand" && fToken == "algo" && tNetwork == "solana" && tToken == "xalgo") return true;
        if (fNetwork == "algorand" && fToken == "xsol" && tNetwork == "solana" && tToken == "sol") return true;
        if (fNetwork == "algorand" && fToken == "usdc" && tNetwork == "solana" && tToken == "usdc") return true;

        return false;
    }
    public async BridgeApprovalTransaction(
        functionName: AlgorandBridgeTxnType,
        routing: Routing,
        token: BridgeToken
    ): Promise<Transaction> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error("Algorand Client is required");
                if (!routing) throw new Error("Bridge Transaction is required");

                //Get Default Parameters
                const params = await this._client.getTransactionParams().do();
                params.fee = 1000;
                params.flatFee = true;

                //Encode Note
                const record = {
                    routing: RoutingString(routing),
                    date: `${new Date()}`,
                };
                const note = algosdk.encodeObj(record);

                //Get app args
                const appArgs = this.appArgs(functionName, routing, token) as Uint8Array[];

                //get accounts
                const accounts: string[] = [];
                switch (functionName) {
                    case AlgorandBridgeTxnType.xsol_deposit:
                        accounts.push(routing.from.address);
                        if (!this._accounts?.asaVault) throw new Error("ASA Vault is required");
                        accounts.push(this._accounts?.asaVault);
                        break;
                    case AlgorandBridgeTxnType.algo_deposit:
                        accounts.push(routing.from.address);
                        if (!this._accounts?.algoVault) throw new Error("Algo vault is required");
                        accounts.push(this._accounts?.algoVault);
                        break;
                    default:
                        accounts.push(routing.from.address);
                        if (!this._accounts?.algoVault) throw new Error("Algo vault is required");
                        accounts.push(this._accounts?.algoVault);
                        break;
                }

                //Get Bridge
                const txn = algosdk.makeApplicationNoOpTxnFromObject({
                    note: note,
                    suggestedParams: params,
                    from: routing.from.address,
                    accounts: accounts,
                    appIndex: Number(this._bridgeApprovalAppId),
                    appArgs: appArgs,
                    rekeyTo: undefined,
                });
                resolve(txn);
            } catch (error) {
                reject(error);
            }
        });
    }

    public async BridgeFeeTransaction(routing: Routing): Promise<Transaction> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error("Algorand Client is required");
                if (!routing) throw new Error("Bridge Transaction is required");

                //Get Token
                const token = await BridgeTokens.get("algorand", routing.from.token);
                if (!token) throw new Error("Token Config is required");
                if (!token.fee_divisor) throw new Error("Token Fee Divisor is required");
                if (!routing.amount) throw new Error("Routing Amount is required");
                if (!this._transactions) throw new Error("Algorand Transactions is required");
                if (!this._accounts?.feeReceiver) throw new Error("Fee Receiver is required");

                //Get Fee Routing
                const feeRouting = RoutingDefault(routing);
                feeRouting.to.network = "algorand";
                feeRouting.to.token = feeRouting.from.token;
                feeRouting.to.address = this._accounts?.feeReceiver;
                feeRouting.units = undefined;

                //Get Fee
                feeRouting.amount = BigNumber(routing.amount).div(token.fee_divisor);

                //Get Transaction
                //  usdc
                let txn: algosdk.Transaction | undefined = undefined;
                if (feeRouting.from.token.toLowerCase() === "algo") {
                    txn = await this._transactions.sendAlgoTransaction(feeRouting);
                } else {
                    console.log(util.inspect(feeRouting, false, null, true /* enable colors */));
                    txn = await this._transactions.sendTokensTransaction(feeRouting, token);
                }
                resolve(txn);
            } catch (error) {
                reject(error);
            }
        });
    }

    public async BridgeDepositTransaction(routing: Routing): Promise<Transaction> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                //Fail Safe
                if (!this._client) throw new Error("Algorand Client is required");
                if (!routing) throw new Error("Bridge Transaction is required");

                //Get Token
                const token = await BridgeTokens.get("algorand", routing.from.token);
                if (!token) throw new Error("Token Config is required");
                if (!token.fee_divisor) throw new Error("Token Fee Divisor is required");
                if (!routing.amount) throw new Error("Routing Amount is required");
                if (!this._transactions) throw new Error("Algorand Transactions is required");

                //Get Fee Routing
                const depositRouting = RoutingDefault(routing);
                depositRouting.to.network = "algorand";
                depositRouting.to.token = depositRouting.from.token;
                depositRouting.units = undefined;

                if (routing.from.token.toLowerCase() == "algo") {
                    if (!this._accounts?.algoVault) throw new Error("Algo Vault is required");
                    depositRouting.to.address = this._accounts?.algoVault;
                } else {
                    if (!this._accounts?.asaVault) throw new Error("ASA Vault is required");
                    depositRouting.to.address = this._accounts?.asaVault;
                }
                //Get Transaction
                let txn: algosdk.Transaction | undefined = undefined;
                if (depositRouting.from.token.toLowerCase() === "algo") {
                    txn = await this._transactions.sendAlgoTransaction(depositRouting);
                } else {
                    console.log(util.inspect(depositRouting, false, null, true /* enable colors */));
                    txn = await this._transactions.sendTokensTransaction(depositRouting, token);
                }
                resolve(txn);
            } catch (error) {
                reject(error);
            }
        });
    }

    // get Id
    public getGlitterAccountAddress(input: AlgorandProgramAccount): string | number | undefined {
        let res: string | number | undefined;
        switch (input) {
            case "asaOwner": {
                res = this._accounts?.asaOwner;
                break;
            }
            case "algoOwner": {
                res = this._accounts?.algoOwner;
                break;
            }
            case "feeReceiver": {
                res = this._accounts?.feeReceiver;
                break;
            }
            case "multiSig1": {
                res = this._accounts?.multiSig1;
                break;
            }
            case "multiSig2": {
                res = this._accounts?.multiSig2;
                break;
            }
            case "bridge": {
                res = this._accounts?.bridge;
                break;
            }
            case "asaVault": {
                res = this._accounts?.asaVault;
                break;
            }
            case "algoVault": {
                res = this._accounts?.algoVault;
                break;
            }
            case "usdcReceiver": {
                res = this._accounts?.usdcReceiver;
                break;
            }
            case "bridgeOwner": {
                res = this._accounts?.bridgeOwner;
                break;
            }
            case "usdcDeposit": {
                res = this._accounts?.usdcDeposit;
                break;
            }
            case "appID": {
                res = this._bridgeApprovalAppId;
                break;
            }
            case "UsdcassetId": {
                res = BridgeTokens.get("algorand", "usdc")?.address;
                break;
            }
            // case "appID": {
            //     res = this._accounts?.bridge;
            //     break;
            // }
            default: {
                console.log("Invalid Address");
                res = undefined;
                break;
            }
        }

        return res;
    }
}

{
    [
        {
            Token: "USDC",
            Mapping: [
                "Algorand|USDC",
                "Solana|USDC",
                "Ethereum|USDC",
                "Avalanche|USDC",
                "Polygon|USDC",
                "Tron|USDC"
            ]
        },
        {
            Token: "ALGO",
            Mapping: [
                "Algorand|ALGO",
                "Solana|xALGO",
            ]
        },
        {
            Token: "SOL",
            "Mapping": [
                "Algorand|xSOL",
                "Solana|SOL",
            ]
        },
    ]
}