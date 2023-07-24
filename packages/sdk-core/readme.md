# @glitter-finance/sdk-core

Typescript/Javascript SDK to bridge tokens using Glitter architecture.

For full documentation, please visit [Glitter Finance Docs](https://6433e9a86502fb78caa76faa--lucky-kulfi-2e833e.netlify.app/)

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

    const supportedTokensAlgorand = BridgeTokens.getTokens(BridgeNetworks.algorand)
    const supportedTokensSolana = BridgeTokens.getTokens(BridgeNetworks.solana)
    const supportedTokensTron = BridgeTokens.getTokens(BridgeNetworks.TRON)
```

4. Bridge Tokens

```typescript
    ...
    
    // Briding xALGO from Solana
    const bridgexAlgoTxId = await sdk.solana?.bridge(
        solAccount.addr,
        algoAccount.addr,
        BridgeNetworks.algorand,
        "xALGO",
        BigInt(10000000)
    )

    console.log(bridgexAlgoTxId)
    
```

# Tests

yarn jest packages/sdk-core/tests/enumToString.test --testNamePattern 'Main Test'