import { BridgeNetworks, getNumericNetworkId } from '../src/lib/common/networks/networks'
import { GlitterBridgeSDK } from '../src/GlitterBridgeSDK'
import { GlitterEnvironment } from '../src/lib/configs/config'

// Add later
// describe("TRON Serde Tests", () => {
//     it('Should serialize/deserialize', () => {
//         const destinationAddress = "7LXIEKO3KLYNKT4TV7IE5CMGNM4UX6MQBKI7UA2KGVDC6MW4OMAJ55BUA4"
//         const destinationChain = BridgeNetworks.algorand

//     })
// })

describe("TRON SDk Test", () => {
    it('Should initialize and get TRON connect', () => {
        const sdk = new GlitterBridgeSDK();
        sdk.setEnvironment(GlitterEnvironment.testnet)

        sdk.connect([
            BridgeNetworks.TRON,
        ])

        const tronConnect = sdk.tron
        expect(tronConnect).toBeTruthy()
    }),
        it('Should provide balance of USDC', async () => {
            const balQueryAccount = "TGJ2oZgXAxK3aWFUtZbi2QQYPeh66BfsJv"
            const CURRENCY = "USDC"
            const sdk = new GlitterBridgeSDK();
            sdk.setEnvironment(GlitterEnvironment.testnet)

            sdk.connect([
                BridgeNetworks.TRON
            ])

            const tronConnect = sdk.tron
            const _blnc = await tronConnect!.getTokenBalanceOnNetwork(
                CURRENCY,
                balQueryAccount
            )

            const balance = BigInt(_blnc.toString()) / BigInt(10 ** 6)
            const humanUnitsBalance = Number(balance)
            expect(humanUnitsBalance).toBeTruthy()
            expect(humanUnitsBalance).toBeGreaterThan(0)
        }),
        it('Should provide BridgeRelease Event', async () => {
            const sdk = new GlitterBridgeSDK();
            sdk.setEnvironment(GlitterEnvironment.mainnet)

            sdk.connect([
                BridgeNetworks.TRON
            ])

            const tronConnect = sdk.tron
            const logs = await tronConnect!.getBridgeLogs("922062ceba3f82dd6b3a5ec98f53c178fc4004f3c3a699125c966ce7a8397657")
            const l = logs.find(x => x.__type === "BridgeRelease")

            expect(l).toBeTruthy()
            console.log(l)
        })
})