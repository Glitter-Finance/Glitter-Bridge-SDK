import { BridgeToken } from "../../common";

export type AlgorandConfig = {
  name: string;
  serverUrl: string;
  serverPort: string | number;
  indexerUrl: string;
  indexerPort: string | number;
  nativeToken: string;
  appProgramId: number;
  accounts: AlgorandAccountsConfig;
  tokens: BridgeToken[];
};

export type AlgorandAccountsConfig = {
  asaOwner: string;
  algoOwner: string;
  bridgeOwner: string;
  feeReceiver: string;
  multiSig1: string;
  multiSig2: string;
  bridge: string;
  asaVault: string;
  algoVault: string;
  usdcReceiver: string;
  usdcDeposit: string;
  tokenBridgeV2Id?: number;
};

export enum AlgorandProgramAccount {
  AsaOwnerAccount = "asaOwner",
  AlgoOwnerAccount = "algoOwner",
  BridgeOwnerAccount = "bridgeOwner",
  FeeRecieverAccount = "feeReceiver",
  MultiSig1Account = "multiSig1",
  MultiSig2Account = "multiSig2",
  BridgeAccount = "bridge",
  AsaVaultAccount = "asaVault",
  AlgoVaultAccount = "algoVault",
  UsdcReceiverAccount = "usdcReceiver",
  UsdcDepositAccount = "usdcDeposit",
  appID = "appID",
  UsdcAssetId = "UsdcassetId",
  xALGOAssetID = "xALGOAssetID",
}
export type PollerOptions = {
  limit?: number;
  minRound?: number;
};
