import algosdk from "algosdk"
import { addr_to_pk, instanceofAlgoAccount } from "../src"
import assert from "assert"
import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers"
import { randomBytes } from "crypto";

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

describe("instanceofAlgoAccount", ()=>{
    it("returns false if is the arg is not an algorand account", ()=>{
        const toTest= { hello:"world" }
        let res=instanceofAlgoAccount(toTest)
        assert(res===false)
        const toTest2= null
        res=instanceofAlgoAccount(toTest2)
        assert(res===false) 
        const toTest3= 28
        res=instanceofAlgoAccount(toTest3)
        assert(res===false) 
        const toTest4= ethers.Wallet.createRandom();
        res=instanceofAlgoAccount(toTest4)
        assert(res===false) 
        const toTest5= PublicKey.unique()
        res=instanceofAlgoAccount(toTest5)
        assert(res===false) 
        const toTest6= { addr:"sdfgsdfg", sk: randomBytes(32) }
        res=instanceofAlgoAccount(toTest6)
        assert(res===false)
    })
    it("return true if the arg is an algorand account", ()=>{
        const acc= algosdk.generateAccount()
        const res=instanceofAlgoAccount(acc)
        assert(res===true)        
    })    
})