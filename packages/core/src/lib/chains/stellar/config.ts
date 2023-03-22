export type StellarConfig = {
    accounts: StellarAccountsConfig;
};
export type StellarAccountsConfig = {
    usdcReceiverAddress: string;
    usdcReceiverTag: string;
    usdcDepositAddress: string;
    usdcDepositTag: string;
};
