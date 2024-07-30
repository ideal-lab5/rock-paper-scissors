# Rock Paper Scissors

This is a demo rock-paper-scissors web3 game that uses randomness from drand. It is a 'lottery style' competitive rock-paper-scissors game.
Players place bets on rock, paper, or scissors before a deadline. When the deadline is reached, a random number is sampled from the drand pallet
and used to choose a random choice of rock, paper, or scissors. The players who beat randomness are rewarded with points.
Points are calculated as the floor((total number of losing players)/(total number winning players)).

## Prerequisites
Install [cargo contract](https://github.com/use-ink/cargo-contract).

 ## Build

``` shell
cargo contract build
```

 ## Test

 ``` shell
cargo contract test
 ```