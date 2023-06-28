import WalletConnect from "@walletconnect/client";
import WalletConnectProvider from "@walletconnect/web3-provider";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";

export class WConnect {
    public ethereumWalletConnector: WalletConnectProvider;
    public algorandWalletConnect: WalletConnect;

    constructor() {
        this.ethereumWalletConnector = new WalletConnectProvider({
            bridge: "https://bridge.walletconnect.org",
            rpc: {
                1: "https://rpc.ankr.com/eth",
                5: "https://rpc.ankr.com/eth_goerli",
                43113: "https://api.avax-test.network/ext/C/rpc",
                43114: "https://avalanche.public-rpc.com",
                137: "https://rpc.ankr.com/polygon",
                80001: "https://rpc.ankr.com/polygon_mumbai",
                42161: "https://rpc.ankr.com/arbitrum",
                10: "https://rpc.ankr.com/optimism",
                1101: "https://rpc.ankr.com/zkevm",
            },
            qrcode: true,
        });

        this.algorandWalletConnect = new WalletConnect({
            bridge: "https://bridge.walletconnect.org",
            qrcodeModal: QRCodeModal
        })
    }
}
