import { PublicKey } from "@solana/web3.js";
import { GlitterBridgeSDK } from "../src/GlitterBridgeSDK";
import { BridgeNetworks } from "../src/lib/common/networks/networks";
import { Shorten } from "../src/lib/common/utils/shorten";
import { GlitterEnvironment } from "../src/lib/configs/config";


describe("429 Errors With Reconnnect", () => {

    it("429 Errors", async () => {
    let sdk = new GlitterBridgeSDK();
    sdk.setEnvironment(GlitterEnvironment.mainnet);
    sdk.connect([BridgeNetworks.solana]);

    await expect(testSignatures(sdk)).resolves.toBe(20);
    },60000);


});

async function testSignatures(sdk: GlitterBridgeSDK): Promise<number> {
    let count = 0;
    for (let i = 0; i < 20; i++) {
        try{
            const newTxns = await sdk.solana?.client?.getSignaturesForAddress(
                new PublicKey(sdk.solana?.tokenBridgePollerAddress || ""),
                {
                    limit: 5,
                }
            )
            count +=1;
            console.log("Count is: " + count)
        } catch (e: any) {
            if (e.message.includes("429")) {
                console.log("429 error")
                i-=1;
                await sdk.solana?.Reconnect();
            }
          

        }
        
    }
    console.log("Count is: " + count)
    return count
}