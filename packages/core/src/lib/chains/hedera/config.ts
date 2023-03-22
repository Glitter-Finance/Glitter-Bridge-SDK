export type HederaConfig = {
    accounts: HederaAccountsConfig;
};
export type HederaAccountsConfig = {
    usdcReceiverAddress: string;
    usdcReceiverTag: string;
    usdcDepositAddress: string;
    usdcDepositTag: string;
};
