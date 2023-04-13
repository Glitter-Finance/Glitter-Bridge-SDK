import './App.css';
import {Container} from '@mui/material';
import Header from "./components/Header";
import BridgeSection from "./components/BridgeSection";
import TransactionsSection from "./components/TransactionsSection";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <div className="App App-header">
      <Container maxWidth="xl">
        <Header/>
      </Container>
      <BridgeSection/>
      <br/>
      <TransactionsSection/>
      <ToastContainer position={"bottom-right"} />
    </div>
  );
}

export default App;
