import { Chains } from "../Chains";

export enum EVMChain {
  ethereum = "ethereum",
  polygon = "polygon",
  avalanche = "avalanche"
}

export const EVMRPCUrls = {
  [Chains.ETHEREUM as number]: ["https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"],
  [Chains.AVALANCHE as number]: ["https://api.avax.network/ext/bc/C/rpc"],
  [Chains.POLYGON as number]: ["https://polygon-rpc.com"],
  [Chains.ARBITRUM as number]: ["https://rpc.ankr.com/arbitrum"],
  [Chains.ZKEVM as number]: ["https://rpc.ankr.com/polygon_zkevm"],
  [Chains.OPTIMISM as number]: ["https://rpc.ankr.com/optimism"],
}
