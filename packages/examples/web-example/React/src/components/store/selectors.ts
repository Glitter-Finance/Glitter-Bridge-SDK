import {IWallet} from "./type";
import {shallowEqual, useSelector} from "react-redux";

export function useSelectors() {
  const wallet: IWallet = useSelector(
    (state: IWallet) => state,
    shallowEqual
  )

  return { wallet };
}
