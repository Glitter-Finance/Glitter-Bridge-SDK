# Glitter-Bridge-SDK-NodeServer

## Running Solana Example:

Install the node dependencies

```
yarn install

```

Navigate to the example file
_/examples/solana.interactive.ts_

Run the example

```
yarn run example:solana

```

\*Note, you can speed up the example by changing the speed parameter

```
npx ts-node examples/solana.interactive -v -s 20
```

//Tests
Due to tsconfig dependencies, these need to be run from the packages/sdk-server terminal location (ex: cd packages/sdk-server)


yarn jest packages/sdk-server/tests/evm/evm.gtt.test --testNamePattern 'Ethereum GTT Deposits'

yarn jest packages/sdk-server/tests/tron/tron.usdc.test --testNamePattern 'Default Cursor Test'

yarn jest packages/sdk-server/tests/evm/evm.nosec.test --testNamePattern 'AVAX NOSEC Test'