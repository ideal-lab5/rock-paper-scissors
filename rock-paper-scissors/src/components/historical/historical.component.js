import React, { useEffect, useState } from 'react';
import './historical.component.css';
import RPSContractService from '../../rps.service';


function HistoricResults({ api, signer, rpsContract }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    async function fetchResults() {
      try {
        const currentRoundNumber = await RPSContractService.getCurrentRoundNumber(api, signer.address, rpsContract);
        const resultsData = [];

        for (let round = 1; round <= currentRoundNumber.Ok; round++) {
          const result = await RPSContractService.getRoundResult(api, signer.address, rpsContract, round);
          let winners = await RPSContractService.getWinners(api, signer.address, rpsContract, round);
          winners = winners.Ok == null ? [] : winners.Ok;

          // winners = winners.map(w => w.toString())
          let out = {
            round: round,
            result: mapIndexToItem(result.Ok),
            winners: winners,
          };
          console.log('out' + out)
          // if (result) {
            resultsData.push(out);
          // }
        }

        console.log(resultsData);
        setResults(resultsData);
      } catch (error) {
        console.error("Error fetching historic results:", error);
      }
    }

    fetchResults();
  }, [api, signer, rpsContract]);

  function mapIndexToItem(i) {
    switch (i) {
      case '0':
        return 'Rock';
      case '1':
        return 'Paper';
      case '2':
        return 'Scissors';
      default:
        return '';
    }
  }

  return (
    <div className="historic-results">
      <h3>Historic Results</h3>
      <table className="results-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Result</th>
            <th>Winners</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={index}>
              <td>{result.round}</td>
              <td>{result.result}</td>
              <td>
                {result.winners.map((winner, idx) => (
                  <span key={idx} className="winner">
                    {winner.slice(0, 6) + '...' + winner.slice(-4)}
                    {idx < result.winners.length - 1 && ', '}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HistoricResults;
