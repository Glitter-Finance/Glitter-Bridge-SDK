import { BridgeNetworks, BridgeTokens, BridgeV2Tokens, ChainStatus, GlitterEnvironment, Sleep, TransactionType } from "@glitter-finance/sdk-core";
import { GlitterSolanaPoller } from "../../src/lib/chains/solana/poller.solana";
import { GlitterPoller } from "../../src/lib/common/poller.Interface";
import { GlitterSDKServer } from "../../src/lib/glitterSDKServer";
import * as util from "util";
import { config } from "dotenv";
import path from "path";
import * as assert from "assert";
//import { done } from 'jest';

describe("Eth Poller USDC Tests ", () => {

    it("Default Ethereum", async () => {

        //Initialize SDK
        const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Ethereum]);

        //local references for ease of use
        const poller = sdk.poller(BridgeNetworks.Ethereum);
        if (!poller) throw Error("Poller is undefined");

        //Deposits
        let expected = [
            "0x6e1f935edad67a6d9cc0d4f5b166ef0c63d781353bab11ec25946c2bff29a9e9",
            "0x921fc2a1305ac26b19a3486612618e80613a8a5c055237a494914c9113b91429",
            "0xc1c7de44084984af9c624b706bd7e2510aa31f6cb09462e25f75950688001071",
            "0x7d6a86ec4fd3f9fe4da54cf411f8b932447d7a6de3096d006db7126d5b902bb2"
        ];

        await common(sdk, poller, TransactionType.Deposit, expected, "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e");
                
        //Releases
        expected = [
            "0x118b728d4a4fd23d8efc34bf5671292e78fe47cd9f061f279664f08f75462755",
            "0x68a2f7ceec9d598ebc4c4505e77657220ac4d835c6d791b755098d736526312c",
        ];

        await common(sdk, poller, TransactionType.Release, expected, "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e");

        //Refunds
        expected = [
            "0x5ae60b28670eedf5b31abea5d8328ddd94eef200852bbcb5a3838386360fc767",
            "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e",
        ];

        await common(sdk, poller, TransactionType.Refund, expected, "0xcc7c1e17c5f4acfd18817c57656c494966b4e8dd0d8746461143833c81ea260e");
        
        Promise.resolve();
    }, 120_000);
    
    it("Default Arbitrum", async () => {

        //Initialize SDK
        const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Arbitrum]);

        //local references for ease of use
        const poller = sdk.poller(BridgeNetworks.Arbitrum);
        if (!poller) throw Error("Poller is undefined");

        //Deposits
        let expected = [
            "0x2d264ca07a63b4ee087b52fd191d6cc0e2629985b94dd0b7aa0223d2e3a4c322",
            "0xa23b0acdefc5e55957ff200e45fd53aa17b950757c5230b7ce5d5758992e0969",
            "0x2aac22ef855eda1d2c03097ce03b327d3b4677b30527cbe8ed3ff99c75ef1660",
            "0x57a146dcb281f27eb87e6aff0bd703281238b50d1a0e0f77ff5e50f492907ff4"
        ];

        await common(sdk, poller, TransactionType.Deposit, expected, "0xae2e173fff1c0bcb65ff9b62a1b7ff10294b736874ab00e77ff716cbbad4b4f0");
                
        //Releases
        expected = [
            "0x452bf9e50e7087c62ba8b2689262aefcce20eaea15b0c076fecc25deab66d2d2",
            "0x1de9a443fe63c4c6d64e4a50bd9095403ee2ef8d0fd2664df02450cd1daf9c57",
        ];

        await common(sdk, poller, TransactionType.Release, expected, "0xae2e173fff1c0bcb65ff9b62a1b7ff10294b736874ab00e77ff716cbbad4b4f0");

        //Refunds
        expected = [
            "0xc2803fb30daacc9bef608f7de8ca74e26675d4f63dd6edea9370d0bb14b0c810",
            "0xae2e173fff1c0bcb65ff9b62a1b7ff10294b736874ab00e77ff716cbbad4b4f0",
        ];

        await common(sdk, poller, TransactionType.Refund, expected, "0xae2e173fff1c0bcb65ff9b62a1b7ff10294b736874ab00e77ff716cbbad4b4f0");
        
        Promise.resolve();
    }, 120_000);

    it("Default Avalanche", async () => {

        //Initialize SDK
        const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Avalanche]);

        //local references for ease of use
        const poller = sdk.poller(BridgeNetworks.Avalanche);
        if (!poller) throw Error("Poller is undefined");

        //Deposits
        let expected = [
            "0x8b0013511478ebfc56d8b54a01bb9f1953a961a02f34986b76a4923993b75ead",
            "0xe74a9418fe81da8af9874fad786c1cc24c8e24192e924f368bb0564ee8c837b6",
            "0x9a081f111c4619c4ca47dfea796e8bcbabd79ee0001f002abc58450b7aa7bfce",
            "0xda1318e11458d53c7bb546ecfff648113e35c96a2cf2229fd619ce45addf8fea"
        ];

        await common(sdk, poller, TransactionType.Deposit, expected, "0x2e4bfd010dfe7ae083fd31becde6ec78e7d2702192682022292887956a71b31c");
                
        //Releases
        expected = [
            "0x407ccaa4fa846c252e9000beca457a7751ab57489eaecabf4e14b07f47dcbbde",
            "0x342f118861cc798f851ac612cbc24753ce5956ac5cf90ed6f35e4129df7952f2",
        ];

        await common(sdk, poller, TransactionType.Release, expected, "0x2e4bfd010dfe7ae083fd31becde6ec78e7d2702192682022292887956a71b31c");

        //Refunds
        expected = [
            "0x2a1f1fff79aa7721132dc8c185b509db6e889ab20e60c7d58f52ccbe5686c6dc",
            "0x2e4bfd010dfe7ae083fd31becde6ec78e7d2702192682022292887956a71b31c",
        ];

        await common(sdk, poller, TransactionType.Refund, expected, "0x2e4bfd010dfe7ae083fd31becde6ec78e7d2702192682022292887956a71b31c");
        
        Promise.resolve();
    }, 120_000);

    it("Default Binance", async () => {

        //Initialize SDK
        const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Binance]);

        //local references for ease of use
        const poller = sdk.poller(BridgeNetworks.Binance);
        if (!poller) throw Error("Poller is undefined");

        //Deposits
        let expected = [
            "0x242e9ab22bc2d9b13b44ded233453bbd2c038f1ce962185c3732d78bfc7f6936",
            "0x99113c5cb66b8a230d97acfcdee89d2ceae3fed234da357dd90db21b3903c558",
            "0xc4aae92b7a73a2c15b9e87790b53ace20d350afba904afd742471a5fc7a4ce08",
            "0x18cbf7fce2f4dcc1b5dbd65bf44808ef25e93e2bb144bb8b83d47173d3ed4e34"
        ];

        await common(sdk, poller, TransactionType.Deposit, expected, "0x729cd3176b09ca14d6997d697d15e2d315d317aebcfcd729aa643331c99b883e");
                
        //Releases
        expected = [
            "0xe19ce137536c3400db77d1c94a88daac2d912382ca98c095a44bd8460e377e43",
            "0xb1e7953ea625579a5f9e7b83f0626692d6ff6bcdd1bf7f388f95b15942be6372",
        ];

        await common(sdk, poller, TransactionType.Release, expected, "0x729cd3176b09ca14d6997d697d15e2d315d317aebcfcd729aa643331c99b883e");

        //Refunds
        expected = [
            "0xcda2b268e5c23e3570e888d367f6a872fc67018c325ac4637bc09716a16ecf68",
            "0x729cd3176b09ca14d6997d697d15e2d315d317aebcfcd729aa643331c99b883e",
        ];

        await common(sdk, poller, TransactionType.Refund, expected, "0x729cd3176b09ca14d6997d697d15e2d315d317aebcfcd729aa643331c99b883e");
        
        Promise.resolve();
    }, 240_000);

    it("Default Zkevm", async () => {

        //Initialize SDK
        const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Zkevm]);

        //local references for ease of use
        const poller = sdk.poller(BridgeNetworks.Zkevm);
        if (!poller) throw Error("Poller is undefined");

        //Deposits
        let expected = [
            "0x502c7ce9b41f11d0d403fa882a2489ba3fe1846e2704799084e7c4dce7955ef5",
            "0xeb2e093caaf8019fbc104ff389b77ea52d92114b38dd7df98f12b0a2a20c83a2",
            "0x0d757976b5906b8986f3f41aa05a46dddce36de534e5e9861aaacfaabffaa4de",
            "0x5f1feca45e5682c90ffdf204ce985bf051bbc1c33cf1fd20b6272ee4eaaf3a45"
        ];

        await common(sdk, poller, TransactionType.Deposit, expected, "0xd376ebf784e7d9abd0c8e505f132b037afb091d5264c04e2e092c27828d06364");
                
        //Releases
        expected = [
            "0x7969126d2f0451274337de025e5c637551be1ca038b912071961f9ef025ab4de",
            "0x793ae3cad13ba29abb4e2e77afde697ee6aec72a3cf03f692d54813b3052dec9",
        ];

        await common(sdk, poller, TransactionType.Release, expected, "0xd376ebf784e7d9abd0c8e505f132b037afb091d5264c04e2e092c27828d06364");

        //Refunds
        expected = [
            "0xe46fd0fc4541f8f31390ecbc00295c5554c7d979b0bf6471d2da55738db2c000",
            "0xd376ebf784e7d9abd0c8e505f132b037afb091d5264c04e2e092c27828d06364",
        ];

        await common(sdk, poller, TransactionType.Refund, expected, "0xd376ebf784e7d9abd0c8e505f132b037afb091d5264c04e2e092c27828d06364");
        
        Promise.resolve();
    }, 240_000);

    it("Default Polygon", async () => {

        //Initialize SDK
        const sdk = new GlitterSDKServer(GlitterEnvironment.testnet);

        //Create Solana Poller
        sdk.createPollers([BridgeNetworks.Polygon]);

        //local references for ease of use
        const poller = sdk.poller(BridgeNetworks.Polygon);
        if (!poller) throw Error("Poller is undefined");

        //Deposits
        let expected = [
            "0xe65e143cee9f5cffb9cfc81efdb003275de727e6d677a50be18d298766d1c4be",
            "0xba1a278b8e5985bd4d12b5d2c635bfac66c9c76ed180af1de7ce4587dd4d3f74",
            "0xb7c54e7d9ca3a0bfa0eed5c4c34cc5183cf1646bc7f260977a956623a407a148",
            "0x81f8eac312cebafd0b94f638c4399acb07239a8d4149bc2d1cd35a8862133391"
        ];

        await common(sdk, poller, TransactionType.Deposit, expected, "0xa3200c0915787a0efe41b14010d1a36396959a2b52b02d9566dd720008fed428");
                
        //Releases
        expected = [
            "0x2cc7a1827df92342d43b476c0a8c231d4b4d96cc28ff534686da2cb82d80667c",
            "0x9a42048b8cfbc295463574ca51b1847de2fc1bc569bbc486217bb38aa4a8b865",
        ];

        await common(sdk, poller, TransactionType.Release, expected, "0xa3200c0915787a0efe41b14010d1a36396959a2b52b02d9566dd720008fed428");

        //Refunds
        expected = [
            "0xb558e13f6e80362714a5fd1cbaae1890916851a9ffc583d838eab439a96a3402",
            "0xa3200c0915787a0efe41b14010d1a36396959a2b52b02d9566dd720008fed428",
        ];

        await common(sdk, poller, TransactionType.Refund, expected, "0xa3200c0915787a0efe41b14010d1a36396959a2b52b02d9566dd720008fed428");
        
        Promise.resolve();
    }, 120_000);
    
    async function common(sdk: GlitterSDKServer, poller: GlitterPoller, txnType: TransactionType, expected: string[], endTxn: string){

        //Ensure Poller & Cursor is defined
        if (!poller) throw Error("Poller is undefined");
        const localCursor = poller.tokenV2Cursor;
        assert(localCursor != undefined, "Cursor is undefined");

        //Set limit to 20 // Token bridge needs to larger since multiple logs are emitted on some blocks
        localCursor.limit = 20;
        localCursor.filter = {
            txnType: txnType,
            chainStatus: ChainStatus.Completed,
        }
            
        //Get Results
        const result = await poller.poll(sdk, localCursor);

        console.log(util.inspect(result, false, null, true /* enable colors */));
        
        //Grab all Txn IDs
        const txnIds = result.txns.map((txn) => txn.txnID);
        assert(txnIds.length == expected.length, `Txn IDs are not ${expected.length}`)

        //Check if all expected txns are present
        assert(txnIds.every((val, index) => val === expected[index]), `Txn ${txnIds} does not match ${expected}`);             

        //Check if next cursor is defined
        assert(result.cursor != undefined, "Next Cursor is undefined");

        //Check value of next cursor
        assert(result.cursor.batch == undefined, "Batch is not undefined");
        assert(result.cursor.end?.txn == endTxn, `End txn is not ${endTxn}`);
        
    }

    afterAll(async () => {
        console.log("Closing SDK");
    });
});
