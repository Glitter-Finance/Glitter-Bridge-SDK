# @glitter-finance/sdk-core

Typescript/Javascript SDK to bridge tokens using Glitter architecture.

## Examples


1. SDK Setup

```typescript
    import { BridgeNetworks, BridgeTokens, GlitterBridgeSDK, GlitterEnvironment } from "@glitter-finance/sdk-core";
    ...

    const sdk = new GlitterBridgeSDK();
    sdk.setEnvironment(GlitterEnvironment.mainnet)
    sdk.connect([
        BridgeNetworks.algorand,
        BridgeNetworks.Avalanche,
        BridgeNetworks.Ethereum,
        BridgeNetworks.Polygon,
        BridgeNetworks.solana,
        BridgeNetworks.TRON,
    ])
```

2. Add Solana and Algorand Accounts

```typescript
    ...
    const algorand = sdk.algorand!
    const solana = sdk.solana!

    const algoAccount = await algorand.accountsStore.add("<mnemonic>")
    const solAccount = await solana.accountStore.add("<mnemonic>")
```

3. Get Supported Tokens List

```typescript
    import { BridgeNetworks, BridgeTokens } from "@glitter-finance/sdk-core";
    ...

    const supportedTokensAlgorand = BridgeTokens.getTokens(BridgeNetworks.Algorand)
    const supportedTokensSolana = BridgeTokens.getTokens(BridgeNetworks.Solana)
    const supportedTokensTron = BridgeTokens.getTokens(BridgeNetworks.TRON)
```