import {Card, CardContent, CardHeader, Container, Pagination, Stack} from "@mui/material";
import Item from "../Item";
import {useSelectors} from "../store/selectors";
import {useEffect, useState} from "react";
import axios from "axios";

function TransactionsSection() {
    const {wallet} = useSelectors();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    useEffect(() => {
        if (wallet.sourceWalletAddress !== "" && wallet.destinationWalletAddress !== "") {
            fetchTransactions();
        }
    }, [wallet.sourceWalletAddress, wallet.destinationWalletAddress, wallet.txId]);

    const fetchTransactions = async (pageNumber = 0) => {
        const skip = pageNumber * 10;
        const response = await axios.get(`https://api.glitterfinance.org/api/accounts?addresses=${wallet.sourceWalletAddress}_${wallet.destinationWalletAddress}&status=Success&sort=date_desc&skip=${skip}&take=10`);
        setTotalCount(response.data.txDetails.totalCount);
        setTransactions(response.data.txDetails.transactions);
    }

    return (
        <Container maxWidth="xl">
            <Stack spacing={2}>
                <Card className="transaction-card-layout">
                    <CardHeader className="basic-card-header-typo transactions-header" title="Transactions"
                                subheader={<><span
                                    className="transactions-sub-header">{`${totalCount} transactions found`}</span></>}/>
                    <CardContent>
                        <Stack>
                            <Item className="transactions-table-header">
                                <Stack direction="row" spacing={2}>
                                    <Item className="transactions-table-header-columns">Status</Item>
                                    <Item className="transactions-table-header-columns">Time</Item>
                                    <Item className="transactions-table-header-columns">Network</Item>
                                    <Item className="transactions-table-header-columns">Address</Item>
                                    <Item className="transactions-table-header-columns">Token</Item>
                                    <Item className="transactions-table-header-columns">Amount</Item>
                                    <Item className="transactions-table-header-columns">TXN Links</Item>
                                </Stack>
                            </Item>
                            <Item>
                                {
                                    transactions.map((transaction) => {
                                        return (
                                            <Stack direction="row" spacing={2}>
                                                <Item className="transactions-table-data-columns success-status">{transaction.status}</Item>
                                                <Item className="transactions-table-data-columns">{new Date(transaction.createdAt).toLocaleString()}</Item>
                                                <Item className="transactions-table-data-columns">{transaction.fromNetwork} → {transaction.toNetwork}</Item>
                                                <Item className="transactions-table-data-columns">{transaction.fromAddress.slice(0, 10)}</Item>
                                                <Item className="transactions-table-data-columns">{transaction.fromToken} → {transaction.toToken}</Item>
                                                <Item className="transactions-table-data-columns">{transaction.amount}</Item>
                                                <Item className="transactions-table-data-columns">
                                                    <img src="/algorand-circle.png" alt="Broken"/>
                                                    <img src="/solana-circle.png" alt="Broken"/>
                                                </Item>
                                            </Stack>
                                        )
                                    })
                                }
                            </Item>
                          <Item>
                            <Pagination count={Math.ceil(totalCount / 10)} onChange={(event: any) => { console.log(event.target.outerText); fetchTransactions(parseInt(event.target.outerText) - 1) }} color="secondary" />
                          </Item>
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>
        </Container>
    );
}

export default TransactionsSection;
