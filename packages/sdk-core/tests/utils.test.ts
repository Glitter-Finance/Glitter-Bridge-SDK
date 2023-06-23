import algosdk from "algosdk"
import { addr_to_pk } from "../src"
import assert from "assert"
import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers"

describe("addr_to_pk", ()=>{
    it("can convert an Algorand account to a public key buffer", ()=>{
        const acc= algosdk.generateAccount()
        const pk=addr_to_pk(acc)
        assert(pk.byteLength===32)
        assert(Buffer.isBuffer(pk))
    })
    it("can convert a Solana PublicKey to a public key buffer", ()=>{
        const account = PublicKey.unique();
        const pk=addr_to_pk(account)
        assert(pk.byteLength===32)
        assert(Buffer.isBuffer(pk))
    })
    it("can convert an EVM address to a public key buffer", ()=>{
        const account = ethers.Wallet.createRandom();
        const pk=addr_to_pk(account.address)
        assert(pk.byteLength===20)
        assert(Buffer.isBuffer(pk))
    })
})