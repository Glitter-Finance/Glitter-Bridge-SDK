<p align="center">
  <img src="https://uploads-ssl.webflow.com/6192268c5227a1c40c9ba3b0/636d358e04bd2d6007a20cee_glitter-logo-trans-nov-1-p-500.png" alt= “box-dev-logo” width="30%" height="50%">
</p>

# Glitter Finance Core SDK

## Examples

1. Create a new Project

If you already have a project, you can skip this step.  

```bash
    mkdir glitter-sdk-example
    cd glitter-sdk-example
    npm init -y
```

2. Install dependencies

```bash

    #Install & Initialize Typescript
    npm install typescript --save-dev
    npx tsc --init

    npm add @glitter-finance/sdk-core
```

3. Code Imports & Setup

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

4. Add Solana and Algorand Accounts

```typescript
    ...
    const algorand = sdk.algorand!
    const solana = sdk.solana!

    const algoAccount = await algorand.accountsStore.add("<mnemonic>")
    const solAccount = await solana.accountStore.add("<mnemonic>")
```

5. Get Supported Tokens List

```typescript
    import { BridgeNetworks, BridgeTokens } from "@glitter-finance/sdk-core";
    ...

    const supportedTokensAlgorand = BridgeTokens.getTokens(BridgeNetworks.algorand)
    const supportedTokensSolana = BridgeTokens.getTokens(BridgeNetworks.solana)
    const supportedTokensTron = BridgeTokens.getTokens(BridgeNetworks.TRON)
```

6. Bridge Tokens

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