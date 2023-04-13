import {WalletAction, DispatchType, IWallet} from "./type";


export function addWallet(wallet: IWallet, type: string) {
  const action: WalletAction = {
    type: type,
    wallet,
  }

  return simulateHttpRequest(action)
}

export function handleWalletConnect(type: string) {
  const action: WalletAction = {
    type: type,
  }

  return simulateHttpRequest(action);
}

export function getTransactionStatus(type: string, wallet: IWallet) {
  const action: WalletAction = {
    type: type,
    wallet
  }

  return simulateHttpRequest(action);
}

export function simulateHttpRequest(action: WalletAction) {
  return (dispatch: DispatchType) => {
    setTimeout(() => {
      dispatch(action)
    }, 500)
  }
}