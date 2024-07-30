# Decentralized Rock-Paper-Scissors

This is a demonstration of how to use publicly verifiable on-chain randomness withink ink! smart contracts. It is a smart contract and associated user interface that allows players to engage in a p2p, competitive rock-paper-scissors game. In this version of RPS, both players play against future randomness, trying to beat it. It is essentially a lottery where players can guess either 0, 1, or 2. 

## Setup

### Pre-requisites

#### Substrate Node
Locally running the project first requires that you run a local Ideal node. You can get started by running the docker image:

``` shell
docker pull ideallabs/ideal-node-template
docker run ideallabs/ideal-node-template --tmp --dev --alice 
```

or use the template repo: https://github.com/ideal-lab5/ideal-node-template

#### Cargo contract

Install the [cargo contract](https://github.com/use-ink/cargo-contract) CLI: 
``` shell
cargo install --force --locked cargo-contract
```

### Setup Steps

0. Build the contract

run :
``` shell
cd contract/rps
cargo contract build
```

1. deploy the contracts

Assuming you have a node running on port 9945 (default is 9944), deploy the contract with the cargo contract CLI. From the root directory, run:

``` shell
cargo contract instantiate ./target/ink/rps.contract --constructor new --args 70  --suri //Bob --url ws://127.0.0.1:9945 -x
```
   
2. configure the UI

Ensure the the constants in App.js use the correct contract address and host.
   
3. run the UI

``` shell
npm i
npm run start
```
