/* global BigInt */
import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { useContext, useEffect, useState } from 'react';
// import { EtfContext } from "../../EtfContext";
import Modal from "./modal";

// import './connect.component.css';

function WalletConnect(props) {

    const [isConnected, setIsConnected] = useState(false);
    const [showWalletSelection, setShowWalletSelection] = useState(true)
    const [signerAddress, setSignerAddress] = useState("");
    const [availableAccounts, setAvailableAccounts] = useState([]);
    const [balance, setBalance] = useState(0);

    // const { etf } = useContext(EtfContext);

    useEffect(() => {
        handleConnect()
    }, []);

    async function connect() {
        await web3Enable('Ideal|RockPaperScissors');
        const allAccounts = await web3Accounts();
        setAvailableAccounts(allAccounts);
    }

    // Handler for the click event of the `Connect` button
    const handleConnect = async () => {
        await connect();
    }

    const checkBalance = async (address) => {
        let bal  = await props.api.query.system.account(address);
        let bigBalance = BigInt(parseInt(bal.data.free))
        setBalance(Number(bigBalance) || 0);
    }

    const handleSelectWallet = (address) => async () => {
        // finds an injector for an address
        const injector = await web3FromAddress(address);
        setSignerAddress(address);
        setIsConnected(true);
        setShowWalletSelection(false);
        props.api.setSigner(injector.signer);
        props.setSigner({ signer: injector.signer, address });
        checkBalance(address)
    }

    return (
        <div className="connect">
            {isConnected ?
                <div className="wallet-amount">
                    <span className="copy" onClick={() => navigator.clipboard.writeText(signerAddress)}>
                        Address: { signerAddress.slice(0, 4) + '...' + signerAddress.slice(signerAddress.length - 4) }
                    </span>
                    <span>Balance: {balance} Tokens</span>
                </div> :
                <div className="connect-modal-container">
                    <Modal
                        title="Select an account"
                        visible={showWalletSelection}
                        onClose={() => setShowWalletSelection(false)}
                    >
                    {availableAccounts.length > 0 ?
                        <table className="account-selection-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Address</th>
                                    <th scope="col"/>
                                </tr>
                            </thead>
                            <tbody>
                                {availableAccounts.map((account, index) => (
                                    <tr key={index}>
                                        <td>
                                            {account.meta.name.substring(0, 8) + (account.meta.name.length > 8 ? ' ...' : '')}
                                        </td>
                                        <td className="address">
                                            <span onClick={() => navigator.clipboard.writeText(account.address)} className='clickable'>
                                                {account.address.substring(0, 8) + '...'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="open-button" onClick={handleSelectWallet(account.address)}>
                                                Connect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table> :
                        <div>
                            <h3>You need a polkadotjs wallet and at least one account to play.</h3>
                        </div>
                    }</Modal>
                    </div>
            }</div>
    );
}

export default WalletConnect;