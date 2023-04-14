<p align="center">
  <img src="https://uploads-ssl.webflow.com/6192268c5227a1c40c9ba3b0/636d358e04bd2d6007a20cee_glitter-logo-trans-nov-1-p-500.png" alt= “box-dev-logo” width="30%" height="50%">
</p>

# Glitter Finance Web SDK

Following SDK is actively developed by dev team of glitter finance and this SDK is actively managed by Glitter team with full support.

## SDK Libraries

1. Wallets (Different Wallet Integrations for different chains)
2. Bridge (Bridging specified tokens between different network)

### Wallets

You can find several wallet implementations in the SDK.
1. Metamask
2. Phantom
3. Solflare
4. Pera
5. Defly
6. Wallet Connect
7. Exodus using Wallet Connect
8. Tronlink
9. Coin 98

All wallets providers and their connect methods are available in the SDK.

### Bridge

You will be able to use bridge functionality through this SDK for several chains.
1. Algorand
2. Polygon
3. Avalanche
4. Ethereum
5. Solana
6. Tron

## Installing
Using npm:

```bash
$ npm i @glitter-finance/sdk-web
```

## Usage

Importing Wallets and using it for different chains.

```ts
import {
  Wallets,
} from "@glitter-finance/sdk-web";
```

Example

```ts
const metamask = new GlitterWallets.networks[chainKey].metamask();
const result = await metamask.connect();
const provider = await metamask.getProvider();
```
In the above code snippet the chainKey is the chainId to which chain the wallet is getting connected.
The chainKey can be specified using ChainNames or Chain ENUM.

```ts
import {
  ChainNames,
  Chains
} from "@glitter-finance/sdk-web";
```

Importing Bridge for each chain and using their functions to bridge.

```ts
import {
  SolanaBridge,
  AlgorandBridge,
  EVMBridge,
  TronBridge,
} from "@glitter-finance/sdk-web";
```

For Solana and Algorand if you want to check whether a token is opted in the wallet or not for that you can use this:

<bold>For Algorand</bold>
```ts
  const bridge = new AlgorandBridge();
  const exists = await obj.optInAccountExists(address, symbol);
```
<bold>For Solana</bold>
```ts
  const bridge = new SolanaBridge(RPC_URL);
  const exists = await obj.optInAccountExists(address, symbol);
```
And if it's not opted in to the wallet then you can use this for the opt in:

<bold>For Algorand</bold>
```ts
  const bridge = new AlgorandBridge();
  const transactions = await bridge.optIn(address, symbol);
```
<bold>For Solana</bold>
```ts
  const bridge = new SolanaBridge(RPC_URL);
  const transactions = await bridge.optIn(address, symbol);
```

The optIn function will return you the unsigned transaction.

For Bridge you can use the below function:

```ts
transactions = await bridge.bridge(swpk, dwpk, dcid, stid, amt);
```
This will return you the unsigned transaction for the respective chain.
This bridge function is present in all Supported network Bridge class.

For further more detail [View Docs](https://api.glitterfinance.org/sdk-docs/modules/_glitter_finance_sdk_web.html)