import React, { useCallback, useEffect, useState } from 'react';
import './App.css';

import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract';
import RPSContractService from './rps.service';
import WalletConnect from './wallet-connect';
import metadata from './resources/rps.json';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandRock, faHandScissors, faHandPaper } from '@fortawesome/free-regular-svg-icons';

import Button from 'react-bootstrap/Button';
import HistoricResults from './components/historical/historical.component';

function App() {

  /* "Header" vars */
  const [roundNumber, setRoundNumber] = useState(-1);
  const [nextBlockNumber, setNextBlockNumber] = useState(-1);
  const [showAbout, setShowAbout] = useState(false);

  /* Game information: current round */
  const [guesses, setGuesses] = useState([]);
  const [choice, setChoice] = useState(null);
  const [maybeChoice, setMaybeChoice] = useState(null);
  const [availableRewardBalance, setAvailableRewardBalance] = useState(0);

  /* Polkadotjs info */
  const [currentBlockNumber, setCurrentBlockNumber] = useState(0);
  const [contractAddress, setContractAddress] = useState(process.env.REACT_APP_CONTRACT_ADDRESS);

  const [suri, setSuri] = useState('Alice');
  const [signer, setSigner] = useState(null);

  const [api, setApi] = useState(null);
  const [rpsContract, setRpsContract] = useState(null);

  useEffect(() => {
    const setupPolkadot = async () => {
      // let provider = new WsProvider('ws://localhost:9944');
      let provider = new WsProvider('wss://etf1.idealabs.network:443');
      let api = await ApiPromise.create({ provider });
      setApi(api);

      const _unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
        setCurrentBlockNumber(parseInt(header.number));
      });

      // connect to the gateway contract
      let rps = new ContractPromise(api, metadata, contractAddress);
      setRpsContract(rps);

      // const keyring = new Keyring();
      // const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519');
      // setSigner(alice);

      // loadRoundDetails(api, alice, rps);
      // loadGuesses(api, alice, rps);
    };

    setupPolkadot();
    // .then(setup());

  }, []);

  // async function handleConnect() {
  //         const keyring = new Keyring();
  //     const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519');
  //     setSigner(alice);

  //     loadRoundDetails(api, alice, rps);
  //     loadGuesses(api, alice, rps);
  // }

  async function handleComplete() {
    await RPSContractService.complete(api, signer.address, rpsContract, async () => {
      loadRoundDetails(api, signer, rpsContract);
      loadGuesses(api, signer, rpsContract);
      setChoice(null);
      setMaybeChoice(null);
    });
  }

  async function handlePlay() {
    await RPSContractService.play(api, signer.address, rpsContract, maybeChoice, async () => {
      await loadGuesses(api, signer, rpsContract);
      setChoice(maybeChoice);
      setMaybeChoice(null);
    });
  }

  async function loadRoundDetails(api, signer, rpsContract) {
    let roundNumber = await RPSContractService.getCurrentRoundNumber(api, signer.address, rpsContract);
    setRoundNumber(roundNumber.Ok);
    for (let i = 0; i < roundNumber.Ok; i++) {
      let result = await RPSContractService.getRoundResult(api, signer.address, rpsContract, i);
      if (result) {
        // console.log('result ' + result.Ok);
        // setRoundResult({roundNumber, result})
      }
    }

    let nextBlockNumber = await RPSContractService.getNextBlockNumber(api, signer.address, rpsContract);
    setNextBlockNumber(parseInt(nextBlockNumber.Ok.replace(",", "")));

    let availableRewardBalance = await RPSContractService.getPoints(api, signer.address, rpsContract);
    if (availableRewardBalance.Ok) {
      setAvailableRewardBalance(parseInt(availableRewardBalance.Ok.replace(",", "")));
    } else {
      setAvailableRewardBalance(0);
    }
  }

  async function loadGuesses(api, signer, rpsContract) {
    let guesses_rock = await RPSContractService.getGuesses(api, signer.address, rpsContract, 0);
    guesses_rock = guesses_rock.Ok;
    if (guesses_rock != null && guesses_rock.includes(signer.address)) {
      setChoice(0);
    }

    let guesses_paper = await RPSContractService.getGuesses(api, signer.address, rpsContract, 1);
    guesses_paper = guesses_paper.Ok;
    if (guesses_paper != null && guesses_paper.includes(signer.address)) {
      setChoice(1);
    }
    let guesses_scissors = await RPSContractService.getGuesses(api, signer.address, rpsContract, 2);
    guesses_scissors = guesses_scissors.Ok;
    if (guesses_scissors != null && guesses_scissors.includes(signer.address)) {
      setChoice(2);
    }

    setGuesses([guesses_rock, guesses_paper, guesses_scissors])
  }

  function mapIndexToItem(i) {
    switch (i) {
      case 0:
        return "rock"
      case 1:
        return "paper"
      case 2:
        return "scissors"
      default:
        return ""
    };
  }

  const handleAccountReload = useCallback((newSigner) => {
    // const keyring = new Keyring();
    // let uri = '//' + suri;
    // const signer = keyring.addFromUri(uri, { name: suri }, 'sr25519');
    setSigner(newSigner);
    loadRoundDetails(api, newSigner, rpsContract);
    loadGuesses(api, newSigner, rpsContract);
    setChoice(null);
    setMaybeChoice(null);
  });

  return (
    <div className="App">
      <header className="App-header">
        <div className="Title">Rock Paper Scissors</div>
        {api != null ? (
          <WalletConnect api={api} setSigner={handleAccountReload} />
        ) : (
          <div>
            <p>Failed to establish a connection with the Ideal network.</p>
            <p>Please try again later or contact us on Discord.</p>
          </div>
        )}
      </header>

      {signer && (
        <div className="content">
          <main className="main-game">
            <div className="game-details">
              <div className="detail-card">
                <div className="detail-icon">💰</div>
                <div className="detail-info">
                  <span className="detail-title">Points</span>
                  <span className="detail-value">{availableRewardBalance}</span>
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-icon">🎮</div>
                <div className="detail-info">
                  <span className="detail-title">Round</span>
                  <span className="detail-value">#{roundNumber}</span>
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-icon">⏰</div>
                <div className="detail-info">
                  <span className="detail-title">Complete at Block</span>
                  <span className="detail-value">{nextBlockNumber}</span>
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-icon">🔄</div>
                <div className="detail-info">
                  <span className="detail-title">Current Block</span>
                  <span className="detail-value">{currentBlockNumber}</span>
                </div>
              </div>
            </div>
            <div className="game-container">
              {currentBlockNumber > nextBlockNumber && (
                <div className="round-over">ROUND OVER</div>
              )}
              <div className="rps-container">
                <div onClick={() => setMaybeChoice(0)}>
                  <FontAwesomeIcon className="icon-container" icon={faHandRock} />
                  {guesses[0] && <div className="num-guesses">({guesses[0].length})</div>}
                </div>
                <div onClick={() => setMaybeChoice(1)}>
                  <FontAwesomeIcon className="icon-container" icon={faHandPaper} />
                  {guesses[1] && <div className="num-guesses">({guesses[1].length})</div>}
                </div>
                <div onClick={() => setMaybeChoice(2)}>
                  <FontAwesomeIcon className="icon-container" icon={faHandScissors} />
                  {guesses[2] && <div className="num-guesses">({guesses[2].length})</div>}
                </div>
              </div>
              <div>
                {currentBlockNumber > nextBlockNumber ? (
                  <button onClick={handleComplete} className="button">Next Game</button>
                ) : (
                  <div>
                    {choice !== null ? (
                      <div className="selection">{mapIndexToItem(choice)}</div>
                    ) : (
                      maybeChoice !== null && (
                        <div>
                          <div className="selection">{mapIndexToItem(maybeChoice)}</div>
                          <button onClick={handlePlay} className="button">Play</button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          <aside className="sidebar">
            <HistoricResults api={api} signer={signer} rpsContract={rpsContract} />
          </aside>
        </div>
      )}

      {showAbout && (
        <div className="info-view">
          <div>
            <h2>About</h2>
            <p>
              This is a fully on-chain and 'endless' rock-paper-scissors game. It uses publicly verifiable
              onchain randomness through the <a href="https://idealabs.network">Ideal Network</a>'s drand bridge.
              The game runs in sequential rounds, where players make their choices of rock paper scissors.
              At the end of a round, a specific future block number, players compete against unbiased randomness produced through threshold BLS signatures.
              Winners are allocated points equivalent to an event split of the number of participants and the number of winners. For example, if there are three participants and one winner, that winner gets three points.
            </p>
            <h3>How to Play</h3>
            <p>
              1. <b>Get tokens</b> from the Discord bot <a href='https://docs.idealabs.network/docs/examples/getting_started'>faucet</a>
            </p>
            <p>
              2. <b>Place your bet</b> During an active round, choose either rock, paper, or scissors.
            </p>
            <p>
              3. <b>Wait</b> for the round to complete.
            </p>
            <p>
              4. <b>Complete the game</b>: Anyone can complete the game, which calculates the system choice (randomness mod 3) and rewards winners with points.
            </p>
            <h3>How it works</h3>
            <p>
              The game runs on a smart contract deployed on the Ideal network. You can find it on github <a href='https://github.com/ideal-lab5/rock-paper-scissors/tree/main/contract/rps'>here</a>.
              It uses a drand to Substrate bridge to inject publicly verifiable randomness into the runtime.
            </p>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>
          <a href="https://docs.idealabs.network/" target="_blank" rel="noopener noreferrer">docs</a> |
          <a href="https://docs.idealabs.network/docs/examples/getting_started" target="_blank" rel="noopener noreferrer">faucet</a> |
          <a href="https://github.com/ideal-lab5/" target="_blank" rel="noopener noreferrer">github</a> |
          <a href="https://discord.gg/4fMDbyRw7R" target="_blank" rel="noopener noreferrer">discord</a>
        </p>
        <p>Ideal Labs, 2024 &#169;</p>
      </footer>
    </div>
  );
}
export default App;
