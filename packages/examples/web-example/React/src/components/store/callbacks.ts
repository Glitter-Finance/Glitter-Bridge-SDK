import {IWallet} from "./type";
import {Dispatch, useCallback} from "react";
import {addWallet, getTransactionStatus, handleWalletConnect} from "./actionCreators";
import {useDispatch} from "react-redux";

export function useCallbacks() {
    const dispatch: Dispatch<any> = useDispatch()
    const saveWallet = useCallback(
        (wallet: IWallet, type: string) => dispatch(addWallet(wallet, type)),
        [dispatch]
    )

    const walletConnect = useCallback(
        (type: string) => dispatch(handleWalletConnect(type)),
        [dispatch]
    )

    const transactionStatus = useCallback(
        (type: string, txId: string, status: string, subStatus: string) => {
            dispatch(getTransactionStatus(type, { txId, status, subStatus }));
        },
        [dispatch]
    )

    return {saveWallet, walletConnect, transactionStatus};
}