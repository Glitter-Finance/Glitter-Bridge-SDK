import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader, FormControl, FormControlLabel, FormLabel,
    Grid, LinearProgress,
    Radio, RadioGroup,
    Stack, TextField,
    Typography
} from "@mui/material";
import Item from "../Item";
import React, {useEffect, useState} from "react";
import {useSelectors} from "../store/selectors";
import {AlgorandBridge, ChainNames, EVMBridge, SolanaBridge} from "glitter-bridge-sdk-web-dev";
import {BridgeMapping, RPC_URL} from "../store/type";
import {ethers} from "ethers";
import {toast} from 'react-toastify';
import {ADD_SOURCE_WALLET, CONNECT_WALLET_MODAL, UPDATE_TRANSACTION_STATUS} from "../store/actionTypes";
import {useCallbacks} from "../store/callbacks";
import axios from "axios";
import { BridgeNetworks, BridgeEvmNetworks } from "@glitter-finance/sdk-core";

function Bridge() {
    const {walletConnect, transactionStatus, saveWallet} = useCallbacks();
    const [optIn, setOptIn] = useState<boolean>(true);
    const [sourceTokenSymbol, setSourceTokenSymbol] = useState<string>("");
    const [destinationTokenSymbol, setDestinationTokenSymbol] = useState<string>("");
    const [destinationTokens, setDestinationTokens] = useState<any>([]);
    const [sourceTokenAmount, setSourceTokenAmount] = useState<number>(0);
    const [loader, setLoader] = useState<boolean>();
    const [alert, setAlert] = useState<boolean>();
    const {wallet} = useSelectors();

    useEffect(() => {
        if (destinationTokens.length > 0) {
            refreshDestinationBalances();
        }
    }, [wallet.destinationTokens])

    const refreshDestinationBalances = () => {
        const destTokens = destinationTokens;
        if (wallet.destinationTokens && wallet.destinationTokens.length > 0) {
            for (let index = 0; index < destTokens[index].length; index++) {
                const token = wallet.destinationTokens.find(x => x.token === destTokens[index].token);
                if (token) {
                    destTokens[index].balance = token.balance;
                }
            }
            setDestinationTokens(destTokens);
        }
    }

    const checkForOptIn = async (tokenSymbol: string) => {
        console.log(tokenSymbol, wallet.destinationNetworkName);
        if (wallet.destinationNetworkName === ChainNames.SOLANA || wallet.destinationNetworkName === ChainNames.ALGORAND) {
            const bridge = wallet.destinationNetworkName === ChainNames.SOLANA ? new SolanaBridge(RPC_URL) : new AlgorandBridge();
            const exists = await bridge.optInAccountExists(wallet.destinationWalletAddress as string, tokenSymbol.toLowerCase());
            setOptIn(!exists);
            console.log(exists);
        } else {
            setOptIn(false);
        }
    }

    const optInBtn = async () => {
        if (wallet.destinationNetworkName === ChainNames.SOLANA) {
            const bridge = new SolanaBridge(RPC_URL);
            const optInTransaction = await bridge.optIn(wallet.destinationWalletAddress as string, destinationTokenSymbol);
            await wallet.destinationWalletProvider.signAndSendTransaction(optInTransaction);
        } else if (wallet.destinationNetworkName === ChainNames.ALGORAND) {
            const bridge = new AlgorandBridge();
            const optInTransaction = await bridge.optIn(wallet.destinationNetworkName as string, destinationTokenSymbol);
            const signedTransaction = await wallet.destinationWalletProvider.signTransaction([optInTransaction]);
            const transactionResponse = await bridge.sendSignTransaction(signedTransaction);
            console.log(transactionResponse);
        }
    }

    const filterTargetToken = async (token: string) => {
        const destTokens = [];
        const bridgeMappingObj = BridgeMapping.find(x => x.sourceToken === token);
        if (wallet.destinationTokens && bridgeMappingObj) {
            for (let index = 0; index < wallet.destinationTokens?.length; index++) {
                if (bridgeMappingObj.destinationToken === wallet.destinationTokens[index].token) {
                    destTokens.push({
                        balance: wallet.destinationTokens[index].balance,
                        token: wallet.destinationTokens[index].token,
                        disabled: false,
                    })
                } else {
                    destTokens.push({
                        balance: wallet.destinationTokens[index].balance,
                        token: wallet.destinationTokens[index].token,
                        disabled: true,
                    })
                }
            }

            setDestinationTokens(destTokens);
        }
    }

    const queryingTransaction = async (transaction: string) => {
        if (transaction !== "") {
            console.log("Loader Started");
            setLoader(true);
            let myInterval: string | number | NodeJS.Timer | undefined;
            const timer = async () => {
                const response = await axios.get(`https://api.glitterfinance.org/api/txns/search?status=Success&txnID=${transaction}&sort=date_desc&skip=0&take=10`);
                if (response.data.transactions.length > 0) {
                    console.log(response.data.transactions[0].status)
                    if (response.data.transactions[0].status === "Success") {
                        clearInterval(myInterval);
                        setLoader(false);
                        toast(response.data.transactions[0].subStatus, {type: "success"});
                        setAlert(true);
                        setTimeout(() => {
                            setAlert(false);
                        }, 3000);
                        updateBalances();
                        transactionStatus(UPDATE_TRANSACTION_STATUS, transaction, response.data.transactions[0].status, response.data.transactions[0].subStatus);
                    }
                }
            }

            myInterval = setInterval(timer, 1000);
        }
    }

    const updateBalances = async () => {
        if (wallet.sourceNetworkName === ChainNames.SOLANA) {
            const bridge = new SolanaBridge(RPC_URL);
            const balances = await bridge.getBalances(wallet.sourceWalletAddress as string)
            saveWallet({
                sourceTokens: balances
            }, ADD_SOURCE_WALLET);
        } else if (wallet.destinationNetworkName === ChainNames.SOLANA) {
            const bridge = new SolanaBridge(RPC_URL);
            const balances = await bridge.getBalances(wallet.destinationWalletAddress as string)
            saveWallet({
                destinationTokens: balances
            }, ADD_SOURCE_WALLET);
        }
        if (wallet.sourceNetworkName === ChainNames.ALGORAND) {
            const bridge = new AlgorandBridge();
            const balances = await bridge.getBalances(wallet.sourceWalletAddress as string)
            saveWallet({
                sourceTokens: balances
            }, ADD_SOURCE_WALLET);
        } else if (wallet.destinationNetworkName === ChainNames.ALGORAND) {
            const bridge = new AlgorandBridge();
            const balances = await bridge.getBalances(wallet.destinationWalletAddress as string)
            saveWallet({
                destinationTokens: balances
            }, ADD_SOURCE_WALLET);
        }
    }

    const bridge = async () => {
        try {
            if (wallet.sourceNetworkName === ChainNames.SOLANA) {
                const bridge = new SolanaBridge(RPC_URL);
                console.log(wallet.sourceWalletAddress as string, sourceTokenSymbol, wallet.destinationNetworkName, wallet.destinationWalletAddress as string, destinationTokenSymbol, sourceTokenAmount);
                const bridgeTransaction = await bridge.bridge(wallet.sourceWalletAddress as string, sourceTokenSymbol, wallet.destinationNetworkName as string, wallet.destinationWalletAddress as string, destinationTokenSymbol, sourceTokenAmount);
                let transaction;
                if (wallet.sourceWalletName === "phantom") {
                    transaction = await wallet.sourceWalletProvider.signAndSendTransaction(bridgeTransaction);
                    transaction = transaction.signature;
                } else if (wallet.sourceWalletName === "solflare") {
                    await wallet.sourceWalletProvider.connect();
                    const signedTransaction = await wallet.sourceWalletProvider.signTransaction(bridgeTransaction);
                    transaction = await bridge.sendSignedTransaction(signedTransaction.serialize(), "mainnet");
                }
                console.log("Solana", transaction);
                queryingTransaction(transaction);
            } else if (wallet.sourceNetworkName === ChainNames.ALGORAND) {
                const bridge = new AlgorandBridge();
                console.log(wallet.sourceWalletAddress as string, sourceTokenSymbol, wallet.destinationNetworkName, wallet.destinationWalletAddress as string, destinationTokenSymbol, sourceTokenAmount);
                const bridgeTransaction = await bridge.bridge(wallet.sourceWalletAddress as string, wallet.destinationNetworkName as BridgeNetworks, wallet.destinationWalletAddress as string, sourceTokenSymbol, sourceTokenAmount);
                console.log('BT', bridgeTransaction);
                const signedTransaction = await wallet.sourceWalletProvider.signTransaction([bridgeTransaction]);
                const transactionResponse = await bridge.sendSignTransaction(signedTransaction);
                console.log(transactionResponse);
                console.log("Algorand", transactionResponse);
                queryingTransaction(transactionResponse);
            } else if (wallet.sourceNetworkName === ChainNames.POLYGON || wallet.sourceNetworkName === ChainNames.AVALANCHE || wallet.sourceNetworkName === ChainNames.ETHEREUM) {
                console.log("EVM");
                const provider = new ethers.providers.Web3Provider(window.ethereum, 43114);
                const signer = provider.getSigner();
                console.log(await signer.getAddress());
                console.log(await signer.getChainId())
                const bridge = new EVMBridge((wallet.sourceNetworkName as unknown) as BridgeEvmNetworks);
                const bridgeAllowances = await bridge.bridgeAllowance(
                    sourceTokenSymbol,
                    signer
                )
                console.log("Bridge Allowance", bridgeAllowances?.toNumber());
                if (bridgeAllowances && bridgeAllowances?.toNumber() < sourceTokenAmount) {
                    const allowance = await bridge.approve(sourceTokenSymbol, sourceTokenAmount, signer);
                    console.log(allowance);
                }
                const bridgeResponse = await bridge.bridge(wallet.destinationNetworkName as BridgeNetworks, sourceTokenSymbol, sourceTokenAmount, wallet.destinationWalletAddress as string, signer)
                console.log(bridgeResponse);
                console.log("EVM", bridgeResponse)
            }
        } catch (e) {
            console.log(JSON.stringify(new Error(e as any).message));
            toast(new Error(e as any).message, {type: "error"});
        }
    }

    const handleOpen = () => {
        walletConnect(CONNECT_WALLET_MODAL);
    }

    return (
        <Card className="basis-card-layout">
            <CardHeader className="basic-card-header basic-card-header-typo" title="Bridge"/>
            <CardContent>

                <Grid container spacing={2} maxWidth="xl">
                    {
                        wallet.sourceWalletAddress !== ""
                            ?
                            <>
                                <Grid item xs={6}>
                                    <Stack>
                                        <Item>
                                            <Typography>From Wallet</Typography>
                                        </Item>
                                        <Item>
                                            <Box sx={{display: 'flex', alignItems: 'flex-end'}} className="bridge-box">
                                                <img src={`/${wallet.sourceWalletName}.png`} className="input-image"
                                                     alt="broken"/>
                                                <Typography>{wallet.sourceWalletAddress?.slice(0, 20)}...</Typography>
                                            </Box>
                                        </Item>
                                        <Item>
                                            <Box sx={{display: 'flex', alignItems: 'flex-end'}} className="bridge-box">
                                                <img src={`/${wallet.sourceNetworkName}.png`} className="input-image"
                                                     alt="broken"/>
                                                <Typography>{wallet.sourceNetworkName?.toUpperCase()}</Typography>
                                            </Box>
                                        </Item>
                                    </Stack>
                                </Grid>
                                <Grid item xs={6}>
                                    <Stack>
                                        <Item>
                                            <Typography>To Wallet</Typography>
                                        </Item>
                                        <Item>
                                            <Box sx={{display: 'flex', alignItems: 'flex-end'}} className="bridge-box">
                                                <img src={`/${wallet.destinationWalletName}.png`}
                                                     className="input-image"
                                                     alt="broken"/>
                                                <Typography>{wallet.destinationWalletAddress?.slice(0, 20)}...</Typography>
                                            </Box>
                                        </Item>
                                        <Item>
                                            <Box sx={{display: 'flex', alignItems: 'flex-end'}} className="bridge-box">
                                                <img src={`/${wallet.destinationNetworkName}.png`}
                                                     className="input-image"
                                                     alt="broken"/>
                                                <Typography>{wallet.destinationNetworkName?.toUpperCase()}</Typography>
                                            </Box>
                                        </Item>
                                    </Stack>
                                </Grid>
                            </>
                            :
                            <>
                                <Grid item xs={6}>
                                    <Button className="connect-wallet-btn" onClick={handleOpen}>Connect Source
                                        Wallet</Button>
                                </Grid>
                            </>
                    }
                    {
                        wallet.destinationWalletAddress !== "" && wallet.sourceWalletAddress !== ""
                            ?
                            <>
                                <Grid item xs={3}></Grid>
                                <Grid item xs={6}>
                                    <Item>
                                        <TextField
                                            type="number"
                                            id="outlined-controlled"
                                            label="Amount"
                                            size="small"
                                            hidden={true}
                                            hiddenLabel={true}
                                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                                setSourceTokenAmount(parseFloat(event.target.value));
                                            }}
                                        />
                                    </Item>
                                </Grid>
                                <Grid item xs={3}></Grid>
                            </>
                            :
                            <></>
                    }
                    {
                        wallet.destinationWalletAddress !== ""
                            ?
                            <>
                                <Grid item xs={6}>
                                    <Item>
                                        <FormControl>
                                            <FormLabel id="demo-row-radio-buttons-group-label">Source Token</FormLabel>
                                            <RadioGroup
                                                aria-labelledby="demo-row-radio-buttons-group-label"
                                                name="row-radio-buttons-group"
                                            >
                                                {
                                                    wallet.sourceTokens?.map((token) => {
                                                        return (
                                                            <FormControlLabel value={token.token} control={<Radio/>}
                                                                              label={`${token.token} (${token.balance})`}
                                                                              onClick={() => {
                                                                                  filterTargetToken(token.token);
                                                                                  setSourceTokenSymbol(token.token)
                                                                              }}/>
                                                        )
                                                    })
                                                }
                                            </RadioGroup>
                                        </FormControl>
                                    </Item>
                                </Grid>

                                <Grid item xs={6}>
                                    <Stack>
                                        <Item>
                                            <FormControl>
                                                <FormLabel id="demo-row-radio-buttons-group-label">Destination
                                                    Token</FormLabel>
                                                <RadioGroup
                                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                                    name="row-radio-buttons-group"
                                                >
                                                    {
                                                        destinationTokens.map((token: any) => {
                                                            return (

                                                                <FormControlLabel value={token.token} control={<Radio/>}
                                                                                  label={`${token.token} (${token.balance})`}
                                                                                  disabled={token.disabled}
                                                                                  onClick={() => {
                                                                                      checkForOptIn(token.token);
                                                                                      setDestinationTokenSymbol(token.token)
                                                                                  }}/>
                                                            )
                                                        })
                                                    }
                                                </RadioGroup>
                                            </FormControl>
                                        </Item>
                                    </Stack>
                                </Grid>
                            </>
                            :
                            <>
                                <Grid item xs={6}>
                                    <Button className="connect-wallet-btn" onClick={handleOpen}>Connect Destination
                                        Wallet</Button>
                                </Grid>
                            </>
                    }
                </Grid>
                <Grid container spacing={2} maxWidth="xl">
                    <Grid item xs={6}>
                        {
                            loader ?
                                <>
                                    <LinearProgress color="secondary"/>
                                </>
                                :
                                alert ?
                                    <>
                                        <Alert severity="success">Successfully Bridge.</Alert>
                                    </>
                                    : <></>
                        }
                    </Grid>
                    <Grid item xs={6}>
                        <Stack>
                            <Item>
                                {
                                    wallet.sourceWalletAddress !== "" && wallet.destinationWalletAddress !== ""
                                        ?
                                        optIn ?
                                            <Button size="large" className="item-button" onClick={() => {
                                                optInBtn()
                                            }}>OPT-IN</Button>
                                            :
                                            <Button size="large" className="item-button" onClick={() => {
                                                bridge()
                                            }}>SWAP</Button>
                                        :
                                        <>
                                        </>
                                }
                            </Item>
                        </Stack>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}

export default Bridge;
