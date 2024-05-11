import { BN, BN_ONE } from "@polkadot/util";

// maximum gas to be consumed for the call. if limit is too small the call will fail.
const gasLimit = -1;
// a limit to how much Balance to be used to pay for the storage created by the contract call
// if null is passed, unlimited balance can be used
const storageDepositLimit = null


const MAX_CALL_WEIGHT2 = new BN(500_000_000_000).isub(BN_ONE);
const MAX_CALL_WEIGHT = new BN(500_000_000_000).isub(BN_ONE);
const PROOFSIZE = new BN(1_000_000_000);

const options = (api) => {
    return {
        gasLimit: api.registry.createType('WeightV2', {
            refTime: MAX_CALL_WEIGHT,
            proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
    };
};

const RPSContractService = {
    async getCurrentRoundNumber(api, from, contract) {        
        const { gasRequired, storageDeposit, result, output } = await contract.query.getCurrentRoundNumber(
            from,
            options(api),
        );
        return output.toHuman();
    },
    async getNextBlockNumber(api, from, contract) {
        const { gasRequired, storageDeposit, result, output } = await contract.query.getNextBlockNumber(
            from,
            options(api),
          );
        return output.toHuman();
    },
    async getGuesses(api, from, contract, option) {
        const { gasRequired, storageDeposit, result, output } = await contract.query.getGuesses(
            from,
            options(api),
            option
          );
        return output.toHuman();
    },
    async getWinners(api, from, contract, roundNumber) {
        const { gasRequired, storageDeposit, result, output } = await contract.query.getWinners(
            from,
            options(api),
            roundNumber
          );
        return output.toHuman();
    },
    async getPoints(api, from, contract) {
        const { gasRequired, storageDeposit, result, output } = await contract.query.getPoints(
            from,
            options(api),
          );
        return output.toHuman();
    },
    async getRoundResult(api, from, contract, roundNumber) {
        const { gasRequired, storageDeposit, result, output } = await contract.query.getResult(
            from,
            options(api),
            roundNumber,
          );
        return output.toHuman();
    },
    async play(api, signer, contract, guess, callback) {
        // formerly know as "endowment"
        let value = api.registry.createType('Balance', 1);
        await contract.tx
            .play({
                gasLimit: api.registry.createType('WeightV2', {
                    refTime: MAX_CALL_WEIGHT,
                    proofSize: PROOFSIZE,
                }),
                storageDepositLimit: null,
                value,
            }, guess)
            .signAndSend(signer, result => {
                if (result.status.isInBlock) {
                    console.log('in a block');
                    callback()
                } else if (result.status.isFinalized) {
                    console.log('finalized');
                }
            });
    },
    async complete(api, signer, contract, callback) {
        await contract.tx
            .complete(options(api))
            .signAndSend(signer, result => {
                if (result.status.isInBlock) {
                    console.log('in a block');
                    callback()
                } else if (result.status.isFinalized) {
                    console.log('finalized');
                }
            });
    },
    async payout(api, signer, contract, callback) {
        await contract.tx
            .payout(options(api))
            .signAndSend(signer, result => {
                if (result.status.isInBlock) {
                    console.log('in a block');
                    callback()
                } else if (result.status.isFinalized) {
                    console.log('finalized');
                }
            });
    }
};

export default RPSContractService;
