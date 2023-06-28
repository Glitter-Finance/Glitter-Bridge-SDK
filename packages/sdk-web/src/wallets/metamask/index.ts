import MetamaskOnboarding from "@metamask/onboarding";
import { CodeStatus } from "./CodeStatusEnum";
import { utils } from "ethers";
import { ChainNativeCurrency, Chains } from "../Chains";
import { EVMRPCUrls } from "../utils/EVM";
declare global {
    interface Window {
        ethereum?: any;
    }
}
export class Metamask {
    async connect(origin?: string): Promise<{ code: CodeStatus, data: string | string[] }> {
        const onBoarding = new MetamaskOnboarding();
        if (!this.isMobileDevice()) {
            // If Metamask is not installed
            if (!MetamaskOnboarding.isMetaMaskInstalled()) {
                onBoarding.startOnboarding();
                return { code: CodeStatus.WAIT, data: "Metamask onboarding Started, Reload the page once account is created." };
            } else {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                return { code: CodeStatus.SUCCESS, data: accounts };
            }
        } else {
            return this.connectToPhoneMetaMask(origin);
        }
    }
    connectToPhoneMetaMask(origin?: string) {
        if (origin) {
            const metamaskAppDeepLink = "https://metamask.app.link/dapp/" + origin;
            return { code: CodeStatus.REDIRECT, data: metamaskAppDeepLink }
        } else {
            return { code: CodeStatus.FAILURE, data: "Origin URI Not Provided for Phone Metamask" }
        }
    }
    isMobileDevice() {
        return 'ontouchstart' in window || 'onmsgesturechange' in window;
    }
    async addChain(chainId: number) {
        const chainName = Chains[chainId];
        const rpcUrls = EVMRPCUrls[chainId];
        const nativeCurrency = ChainNativeCurrency[chainId];
        const hexChain = utils.hexValue(chainId);
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: hexChain,
                rpcUrls,
                chainName,
                nativeCurrency
            }],
        });
    }

    async switchChain(chainId: number) {
        const hexChain = utils.hexValue(chainId);
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChain }],
        });
    }

    async getProvider(): Promise<any> {
        return window.ethereum;
    }
}
