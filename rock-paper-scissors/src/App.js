import logo from './logo.svg';
import React, {useEffect, useState} from 'react';
import './App.css';

import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract';
import RPSContractService from './rps.service';
import metadata from './resources/rps.json';

function App() {

  /* "Header" vars */
  const [roundNumber, setRoundNumber] = useState(-1);
  const [nextBlockNumber, setNextBlockNumber] = useState(-1);

  /* Game information: current round */
  const [guesses, setGuesses] = useState([]);
  const [choice, setChoice] = useState(null);
  const [maybeChoice, setMaybeChoice] = useState(null);
  const [availableRewardBalance, setAvailableRewardBalance] = useState(0);

  /* Polkadotjs info */
  const [currentBlockNumber, setCurrentBlockNumber] = useState(0);
  const [contractAddress, setContractAddress] = useState('5H6qzrDpXwHSocudgsTpV5UxanvNpgtb5xivnBsJ5DEpL9Sb');

  const [suri, setSuri] = useState('Alice');
  const [signer, setSigner] = useState(null);

  const [api, setApi] = useState(null);
  const [rpsContract, setRpsContract] = useState(null);



  useEffect(() => {
    let player_id = 13;

    const setupPolkadot = async () => {
      let provider = new WsProvider('ws://localhost:9944');
      let api = await ApiPromise.create({ provider });
      setApi(api);

      const _unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
        setCurrentBlockNumber(parseInt(header.number));
      });

      // connect to the gateway contract
      let rps = new ContractPromise(api, metadata, contractAddress);
      setRpsContract(rps);

      const keyring = new Keyring();
      const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519');
      setSigner(alice);

      loadRoundDetails(api, alice, rps);
      loadGuesses(api, alice, rps);



      // setGuesses(guesses);

      // let chosenGuess = guesses.findIndex(g => g.includes(player_id))
      // if (chosenGuess > -1) {
      //   setChoice(chosenGuess);
      // }
    };

    // const setup = async (signer, contract) => {
    //   let roundNumber = await RPSContractService.getCurrentRoundNumber(signer, contract);
    //   setRoundNumber(roundNumber);

    //   let nextBlockNumber = await RPSContractService.getNextBlockNumber();
    //   setNextBlockNumber(nextBlockNumber);

    //   let guesses = await RPSContractService.getGuesses();
    //   setGuesses(guesses);

    //   let chosenGuess = guesses.findIndex(g => g.includes(player_id))
    //   if (chosenGuess > -1) {
    //     setChoice(chosenGuess);
    //   }
    // };

    setupPolkadot();
      // .then(setup());

  }, []);

  async function handleComplete() {
    await RPSContractService.complete(api, signer, rpsContract, async () => {
      loadRoundDetails(api, signer, rpsContract);
      setChoice(null);
      setMaybeChoice(null);
    });
  }

  async function handlePlay() {
    await RPSContractService.play(api, signer, rpsContract, maybeChoice, async () => {
      await loadGuesses(api, signer, rpsContract);
      setChoice(maybeChoice);
    });
  }

  async function loadRoundDetails(api, signer, rpsContract) {
    let roundNumber = await RPSContractService.getCurrentRoundNumber(api, signer.address, rpsContract);
    setRoundNumber(roundNumber.Ok);
    for (let i = 0; i < roundNumber.Ok; i++) {
      console.log(i)
      let result = await RPSContractService.getRoundResult(api, signer.address, rpsContract, i);
      if (result) {
        console.log('result ' + result.Ok);
      }
    }

    let nextBlockNumber = await RPSContractService.getNextBlockNumber(api, signer.address, rpsContract);
    setNextBlockNumber(parseInt(nextBlockNumber.Ok.replace(",", "")));

    let availableRewardBalance = await RPSContractService.getPendingRewardBalance(api, signer.address, rpsContract);
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

    console.log(guesses_rock);
    console.log(guesses_paper);
    console.log(guesses_scissors);
  }

  function handleAccountReload() {
    const keyring = new Keyring();
    let uri = '//' + suri;
    const signer = keyring.addFromUri(uri, { name: suri }, 'sr25519');
    setSigner(signer);

    loadRoundDetails(api, signer, rpsContract);
    loadGuesses(api, signer, rpsContract);
    setChoice(null);
    setMaybeChoice(null);
  }

  return (
    <div className="App">
      <div>
        Rock Paper Scissors
      </div>
      <div className='Header'>
        <span>
          Welcome { signer ? signer.address : '' }
        </span>
        <span>
          Current round # { roundNumber }
        </span>
        <span>
          Round complete at block { nextBlockNumber }
        </span>
        <span>
          Current block number { currentBlockNumber }
        </span>
        <div>
          <input type="text" onChange={(e) => setSuri(e.target.value)} value={ suri }/>
          <button onClick={handleAccountReload}>Update</button>
        </div>
      </div>
      <div className='rewards-container'>
        <button>withdraw { availableRewardBalance }</button>
      </div>
      <div className="game-container">
        <div className="rps-container">
          <div onClick={() => setMaybeChoice(0)}>
            Rock
            <div>
              { guesses.length > 0 ? 
              <div>
                {guesses[0].length}
              </div> : <div></div> }
            </div>
          </div>
          <div onClick={() => setMaybeChoice(1)}>
            Paper
            <div>
            { guesses.length > 0 ? 
              <div>
                {guesses[1].length}
              </div> : <div></div> }
            </div>
          </div>
          <div onClick={() => setMaybeChoice(2)}>
            Scissors
            <div>
            { guesses.length > 0 ? 
              <div>
                {guesses[2].length}
              </div> : <div></div> }
            </div>
          </div>
        </div>
        <div>
        { currentBlockNumber > nextBlockNumber ? 
          <div>
            <button onClick={handleComplete}>Complete</button>
          </div> : 
          <div>
            { choice != undefined ?
              <div>
              <div>
                <span>You chose { choice }</span>
              </div>
            </div> : <div>

              { maybeChoice != undefined ? 
                  <div>
                    <div>
                      <span>You chose { maybeChoice }</span>
                    </div>
                    <button onClick={handlePlay}>Submit</button>
                  </div> : 
                  <div></div>
                }
              </div> }
           </div> }
        </div>
      </div>
    </div>
  );
}

export default App;
