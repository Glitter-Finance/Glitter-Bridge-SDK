import {Box, Button, Grid, Modal, Stack} from "@mui/material";
import React, {useCallback, useState} from "react";
import Item from "./Item";
import {Chains, RPC_URL} from "./store/type";
import {AlgorandBridge, ChainNames, EVMBridge, Wallets as GlitterWallets} from "glitter-bridge-sdk-web-dev";
import {SolanaBridge, Chains as BridgeChains} from "glitter-bridge-sdk-web-dev";
import {ADD_DESTINATION_WALLET, ADD_SOURCE_WALLET, CONNECT_WALLET_MODAL} from "./store/actionTypes";
import {useSelectors} from "./store/selectors";
import {useCallbacks} from "./store/callbacks";
import { BridgeNetworks, BridgeEvmNetworks } from "@glitter-finance/sdk-core";

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 800,
  background: "#452260f0",
  border: '2px solid #8b49bf00',
  boxShadow: 24,
  color: "white !important",
  pt: 2,
  px: 4,
  pb: 3,
};

function Header() {
  const {wallet} = useSelectors();
  const {saveWallet, walletConnect} = useCallbacks();
  const [sourceChain, setSourceChain] = useState<string>("");
  const [destinationChain, setDestinationChain] = useState<string>("");
  const [sourceChainVisible, setSourceChainVisible] = useState<boolean>(true);
  const [destinationChainVisible, setDestinationChainVisible] = useState<boolean>(true);
  const [sourceWallets, setSourceWallets] = useState<{ name: string, icon: string }[]>([]);
  const [destinationWallets, setDestinationWallets] = useState<{ name: string, icon: string }[]>([]);
  const [open, setOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    setOpen(wallet.walletModal ? wallet.walletModal : false);
  }, [wallet.walletModal]);
  const handleOpen = () => {
    walletConnect(CONNECT_WALLET_MODAL);
  };
  const handleClose = () => {
    walletConnect(CONNECT_WALLET_MODAL)
  };

  const onSourceWalletSelection = useCallback(async (walletName: "phantom" | "solflare" | "metamask" | "defly" | "pera" | "coin98") => {
    if (sourceChain === ChainNames.SOLANA) {
      const typeWalletName: "phantom" | "solflare" | "coin98" = walletName.toLowerCase() as "phantom" | "solflare";
      let solanaWallet = new GlitterWallets.networks[BridgeChains.SOLANA][typeWalletName](RPC_URL);
      
      const result = await solanaWallet.connect();
      const phantomProvider = await solanaWallet.getProvider();
      let balances: { token: string; balance: number | undefined }[] = [];
      console.log(phantomProvider);
      const solanaBridge = new SolanaBridge(RPC_URL);
      console.log("Solana");
      const balancesObj = await solanaBridge.getBalances(result?.toString() as string)
      console.log(balancesObj, "testing");
      saveWallet({
        sourceWalletAddress: result?.toString(),
        sourceWalletName: walletName,
        sourceWalletProvider: phantomProvider,
        sourceNetworkName: ChainNames.SOLANA,
        sourceTokens: balances
      }, ADD_SOURCE_WALLET);
    } else if (sourceChain === ChainNames.ALGORAND) {
      const typeWalletName: "defly" | "pera" = walletName.toLowerCase() as "pera" | "defly";
      const algorandWallet = new GlitterWallets.networks[BridgeChains.ALGO][typeWalletName]();
      let algorandResponse;
      let balances: { token: string; balance: number | undefined }[] = [];

      try {
        algorandResponse = await algorandWallet.connect();
      } catch (e) {
        algorandResponse = await algorandWallet.reconnect();
      }

      const algorandBridge = new AlgorandBridge();
      console.log("Algorand");
      const balancesAlgo = await algorandBridge.getBalances(algorandResponse.wallet[0] as string)
      console.log(balancesAlgo.keys(), balancesAlgo.values());
      saveWallet({
        sourceWalletAddress: algorandResponse.wallet[0],
        sourceWalletName: typeWalletName,
        sourceWalletProvider: algorandResponse.provider,
        sourceNetworkName: ChainNames.ALGORAND,
        sourceTokens: balances
      }, ADD_SOURCE_WALLET);
    } else if (sourceChain === ChainNames.ETHEREUM || sourceChain === ChainNames.POLYGON || sourceChain === ChainNames.AVALANCHE) {
      const metamask = new GlitterWallets.networks[BridgeChains.ETHEREUM].metamask();
      const result = await metamask.connect();
      const evmBridge = new EVMBridge((sourceChain as unknown) as BridgeEvmNetworks);
      let balances: { token: string; balance: any | undefined }[] = [];
      const balancesObj = await evmBridge.getBalances(result.data[0])
      console.log(balancesObj);
      saveWallet({
        sourceWalletAddress: result.data[0],
        sourceWalletName: "metamask",
        sourceWalletProvider: await metamask.getProvider(),
        sourceNetworkName: sourceChain,
        sourceTokens: balances
      }, ADD_SOURCE_WALLET);

    }
  }, [saveWallet, wallet, sourceChain])

  const onDestinationWalletSelection = useCallback(async (walletName: "phantom" | "solflare" | "metamask" | "defly" | "pera") => {
    if (destinationChain === ChainNames.SOLANA) {
      const typeWalletName: "phantom" | "solflare" | "coin98" = walletName.toLowerCase() as "phantom" | "solflare";
      let solanaWallet;
      solanaWallet = new GlitterWallets.networks[BridgeChains.SOLANA][typeWalletName](RPC_URL);
      
      const result = await solanaWallet.connect();
      const phantomProvider = await solanaWallet.getProvider();
      let balances: { token: string; balance: number | undefined }[] = [];

      const solanaBridge = new SolanaBridge(RPC_URL);
      // balances = await solanaBridge.getBalances(result?.toString() as string)
      saveWallet({
        destinationWalletAddress: result?.toString(),
        destinationWalletName: walletName,
        destinationWalletProvider: phantomProvider,
        destinationNetworkName: ChainNames.SOLANA,
        destinationTokens: balances
      }, ADD_DESTINATION_WALLET);
    } else if (destinationChain === ChainNames.ALGORAND) {
      const typeWalletName: "defly" | "pera" = walletName.toLowerCase() as "pera" | "defly";
      const algorandWallet = new GlitterWallets.networks[BridgeChains.ALGO][typeWalletName]();
      let algorandResponse;
      let balances: { token: string; balance: number | undefined }[] = [];

      try {
        algorandResponse = await algorandWallet.connect();
      } catch (e) {
        algorandResponse = await algorandWallet.reconnect();
      }

      const algorandBridge = new AlgorandBridge();
      // balances = await algorandBridge.getBalances(algorandResponse.wallet[0] as string)


      saveWallet({
        destinationWalletAddress: algorandResponse.wallet[0],
        destinationWalletName: typeWalletName,
        destinationWalletProvider: algorandResponse.provider,
        destinationNetworkName: ChainNames.ALGORAND,
        destinationTokens: balances
      }, ADD_DESTINATION_WALLET);

    } else if (destinationChain === ChainNames.ETHEREUM || destinationChain === ChainNames.POLYGON || destinationChain === ChainNames.AVALANCHE) {
      const metamask = new GlitterWallets.networks[BridgeChains.ETHEREUM].metamask();
      const result = await metamask.connect();
      const evmBridge = new EVMBridge((destinationChain as unknown) as BridgeEvmNetworks);
      let balances: { token: string; balance: any | undefined }[] = [];
      balances = await evmBridge.getBalances(result.data[0])
      console.log(balances);
      saveWallet({
        destinationWalletAddress: result.data[0],
        destinationWalletName: "metamask",
        destinationWalletProvider: await metamask.getProvider(),
        destinationNetworkName: destinationChain,
        destinationTokens: balances
      }, ADD_DESTINATION_WALLET);

    }
  }, [saveWallet, wallet, destinationChain]);

  const onDisconnectWallet = useCallback(async (type: "source" | "destination") => {
    if (type === "source") {
      saveWallet({
        sourceWalletAddress: "",
        sourceWalletName: "",
        sourceWalletProvider: "",
        sourceNetworkName: "",
        sourceTokens: []
      }, ADD_SOURCE_WALLET);
      setSourceChainVisible(true);
    } else if (type === "destination") {
      saveWallet({
        destinationWalletAddress: "",
        destinationWalletName: "",
        destinationWalletProvider: "",
        destinationNetworkName: "",
        destinationTokens: []
      }, ADD_DESTINATION_WALLET);
      setDestinationChainVisible(true);
    }
  }, [saveWallet])

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <img src="./logo512.png" alt="logo" className="logo"/>
        </Grid>
        <Grid item xs={6}></Grid>
        <Grid item xs={2}>
          <Button className="connect-wallet-btn" onClick={handleOpen}>Connect Wallet</Button>
        </Grid>
      </Grid>
      <Modal
        id={"wallet-modal"}
        open={open}
        onClose={handleClose}
        aria-labelledby="child-modal-title"
        aria-describedby="child-modal-description"
      >
        <Box sx={{...style, width: 500}}>
          <h2 id="child-modal-title">Wallets Selection</h2>
          <p id="child-modal-description">
            Select Chains and then Wallets for Source and Destination.
          </p>
          <Stack>
            <div>
              <Item className="zero-padding">
                <h3 className="white align-left text-underline">Source Chain</h3>
              </Item>
              {
                wallet.sourceWalletName && wallet.sourceNetworkName &&
                (
                  <Item className="zero-padding">
                    <h5
                      className="white align-left">{wallet.sourceNetworkName[0].toUpperCase() + wallet.sourceNetworkName.slice(1)} {"->"} {wallet.sourceWalletName[0].toUpperCase() + wallet.sourceWalletName.slice(1)}</h5>
                  </Item>
                )
              }
              <Item>
                <Grid container spacing={2} maxWidth="xl">
                  {
                    sourceChainVisible && Chains.map((chain) => {
                      return (
                        <Grid item xs={3} style={{
                          cursor: "pointer", padding: "16px 0px 0px 0px",
                          border: "1px solid #fff"
                        }} onClick={() => {
                          setSourceWallets(chain.wallets);
                          setSourceChainVisible(false);
                          setSourceChain(chain.name);
                        }}>
                          <img src={chain.icon}/>
                          <p className="white">{chain.name[0].toUpperCase() + chain.name.slice(1)}</p>
                        </Grid>
                      )
                    })
                  }
                  {
                    !wallet.sourceWalletName ?
                      !sourceChainVisible && sourceWallets.map((wallet: any) => {
                        return (
                          <Grid item xs={3} style={{
                            cursor: "pointer", padding: "16px 0px 0px 0px",
                            border: "1px solid #fff"
                          }} onClick={() => {
                            console.log("Clicked");
                            onSourceWalletSelection(wallet.name);
                          }}>
                            <img src={wallet.icon}/>
                            <p className="white">{wallet.name[0].toUpperCase() + wallet.name.slice(1)}</p>
                          </Grid>
                        )
                      })
                      :
                      <>
                        <Grid item xs={8}>
                          <p className="white align-left">{wallet.sourceWalletAddress?.slice(0, 35)}...</p>
                        </Grid>
                        <Grid item xs={4}>
                          <img src={"unplugged.png"} onClick={() => { onDisconnectWallet("source") }}/>
                        </Grid>
                      </>
                  }
                </Grid>
              </Item>
            </div>
            <div>
              <Item className="zero-padding">
                <h3 className="white align-left text-underline">Destination Chain</h3>
              </Item>
              {
                wallet.destinationWalletName && wallet.destinationNetworkName &&
                (
                  <Item className="zero-padding">
                    <h5
                      className="white align-left zero-padding">{wallet.destinationNetworkName[0].toUpperCase() + wallet.destinationNetworkName.slice(1)} {"->"} {wallet.destinationWalletName[0].toUpperCase() + wallet.destinationWalletName.slice(1)}</h5>
                  </Item>
                )
              }
              <Item>
                <Grid container spacing={2} maxWidth="xl">
                  {
                    destinationChainVisible && Chains.map((chain) => {
                      return (
                        <Grid item xs={3} style={{
                          cursor: "pointer", padding: "16px 0px 0px 0px",
                          border: "1px solid #fff"
                        }} onClick={() => {
                          setDestinationWallets(chain.wallets);
                          setDestinationChainVisible(false);
                          setDestinationChain(chain.name)
                        }}>
                          <img src={chain.icon}/>
                          <p className="white">{chain.name[0].toUpperCase() + chain.name.slice(1)}</p>
                        </Grid>
                      )
                    })
                  }
                  {
                    !wallet.destinationWalletName ?
                      !destinationChainVisible && destinationWallets.map((wallet: any) => {
                        return (
                          <Grid item xs={3} style={{
                            cursor: "pointer", padding: "16px 0px 0px 0px",
                            border: "1px solid #fff"
                          }} onClick={() => {
                            onDestinationWalletSelection(wallet.name);
                          }}>
                            <img src={wallet.icon}/>
                            <p className="white">{wallet.name[0].toUpperCase() + wallet.name.slice(1)}</p>
                          </Grid>
                        )
                      })
                      :
                      <>
                        <Grid item xs={8}>
                          <p className="white align-left">{wallet.destinationWalletAddress?.slice(0, 35)}...</p>
                        </Grid>
                        <Grid item xs={4}>
                          <img src={"unplugged.png"} onClick={() => { onDisconnectWallet("destination") }}/>
                        </Grid>
                      </>
                  }
                </Grid>
              </Item>
            </div>
          </Stack>
        </Box>
      </Modal>
    </>
  );
}

export default Header;