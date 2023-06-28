import { Chains } from "../Chains";

export enum EVMChain {
  ethereum = "ethereum",
  polygon = "polygon",
  avalanche = "avalanche",
  zkevm = "zkevm",
  optimism = "optimism",
  arbitrum = "arbitrum",
}

export const EVMRPCUrls = {
    [Chains.ETHEREUM as number]: ["https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"],
    [Chains.AVALANCHE as number]: ["https://api.avax.network/ext/bc/C/rpc"],
    [Chains.POLYGON as number]: ["https://polygon-rpc.com"],
    [Chains.ARBITRUM as number]: ["https://arb1.arbitrum.io/rpc"],
    [Chains.ZKEVM as number]: ["https://zkevm.io/rpc"],
    [Chains.OPTIMISM as number]: ["https://rpc.ankr.com/optimism"],
}
