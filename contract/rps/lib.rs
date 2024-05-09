#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod rps {
    use gateway::GatewayRef;
    use ink::storage::Mapping;
    use ink::prelude::vec::Vec;
    
    #[derive(Clone, PartialEq, Debug, scale::Decode, scale::Encode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub enum Error {
        /// the guess was out of range
        OutOfRange,
        /// the deposit amount is too low
        DepositTooLow,
        /// the current round is in progress and cannot be ended
        RoundInProgress,
    }

    pub const MIN_TOKEN: Balance = 1;

    pub type RoundNumber = u32;

    #[ink(storage)]
    pub struct Rps {
        /// stores a mapping of guesses
        guesses: Mapping<u8, Vec<AccountId>>,
        /// track the winners
        winners: Mapping<RoundNumber, Vec<AccountId>>,
        reward_tracker: Mapping<AccountId, Balance>,
        round_reward: Mapping<RoundNumber, Balance>,
        round_result: Mapping<RoundNumber, u8>,
        /// the highest block number for which the clock can be advanced
        next_block_number: BlockNumber,
        current_round_number: RoundNumber,
        /// the smart contract light client AccountId
        gateway: AccountId,
    }

    impl Rps {
        
        #[ink(constructor)]
        pub fn new(
            gateway: AccountId,
            start_block_number: BlockNumber,
        ) -> Self {
            Self {
                guesses: Mapping::new(),
                winners: Mapping::new(),
                reward_tracker: Mapping::new(),
                round_reward: Mapping::new(),
                round_result: Mapping::new(),
                current_round_number: 0,
                next_block_number: start_block_number,
                gateway,
            }
        }

        /// by default games are not playable... :/
        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new([0;32].into(), 0)
        }

        #[ink(message)]
        pub fn get_current_round_number(&self) -> RoundNumber {
            self.current_round_number
        }

        #[ink(message)]
        pub fn get_next_block_number(&self) -> RoundNumber {
            self.next_block_number
        }

        #[ink(message)]
        pub fn get_winners(&self, round_number: RoundNumber) -> Option<Vec<AccountId>> {
            self.winners.get(round_number)
        }

        #[ink(message)]
        pub fn get_guesses(&self, option: u8) -> Option<Vec<AccountId>> {
            self.guesses.get(option)
        }

        #[ink(message)]
        pub fn get_pending_reward_balance(&self) -> Option<Balance> {
            self.reward_tracker.get(self.env().caller())
        }

        #[ink(message)]
        pub fn get_result(&self, round_number: RoundNumber) -> Option<u8> {
            self.round_result.get(round_number)
        }

        /// input a guess for the upcoming round
        #[ink(message, payable)]
        pub fn play(
            &mut self, 
            guess: u8,
        ) -> Result<(), Error> {
            if guess > 2 {
                return Err(Error::OutOfRange);
            }
            // check transferred amount
            let weight = self.env().transferred_value();
            if weight != MIN_TOKEN {
                return Err(Error::DepositTooLow);
            }

            // update current round reward pool
            let balance = self.round_reward.get(self.current_round_number).unwrap_or_default();
            self.round_reward.insert(self.current_round_number, &balance.saturating_add(MIN_TOKEN));

            let caller = self.env().caller();
            
            let mut guessed_by = self.guesses.get(guess).unwrap_or_default();
            guessed_by.push(caller);

            self.guesses.insert(guess, &guessed_by);
            Ok(())
        }

        #[ink(message)]
        #[allow(clippy::arithmetic_side_effects)]
        pub fn complete(&mut self) {
            let block_number = self.env().block_number();
            // assert!(block_number > next_block_number, Error::RoundInProgress);

            // fetch the randomness for the 'next_block_number'
            let gateway_contract: GatewayRef =
                ink::env::call::FromAccountId::from_account_id(self.gateway);

            // we can only finish the round if there is randomness for it
            // need to be careful later.. if the gateway misses an expected next_block_number
            // then we could run into trouble, so we need a fallback mechanism....
            // I'm already running into this with problem
            if let Some(hex) = gateway_contract.read_block(self.next_block_number) {
                let result: u8 = hex.iter().sum::<u8>() % 3;
                self.round_result.insert(self.current_round_number, &result);
                let winners = self.guesses.get(result).unwrap_or_default();
                self.winners.insert(self.current_round_number, &winners);
                // each winner gets their 1 token back
                // plus an even split of the rest of the pool, reserving 5% for dev team
                let amount = self.round_reward.get(self.current_round_number).unwrap_or_default();
                
                let reserve_amount = amount.saturating_mul(5).saturating_div(100);
                let winner_length: u128 = winners.len().try_into().unwrap();
                if winner_length > 0 {
                    // this line would normally be called out by clippy, since it thinks winner_length can be 0
                    // however, we explicitly check for this condition and so we ignore the error
                    let split_amount = amount.saturating_sub(reserve_amount).saturating_div(winner_length);
                    // let split_amount = amount.saturating_div(winner_length);

                    winners.iter().for_each(|w| {
                        let balance = self.reward_tracker.get(w).unwrap_or_default();
                        let new_balance = balance.saturating_add(split_amount);
                        self.reward_tracker.insert(w, &new_balance);
                    });
                }

                self.current_round_number = self.current_round_number.saturating_add(1);
                let mut next = block_number.saturating_add(15);
                // round to nearest multiple of 5
                next = (next.saturating_add(4).saturating_div(5)).saturating_mul(5);
                self.next_block_number = next;

                self.guesses.remove(0);
                self.guesses.remove(1);
                self.guesses.remove(2);
            }

            // make cross-contract call to get the sig from the round
            // convert the hex to a number, take it mod 3 to determine the result
        }

        #[ink(message)]
        pub fn payout(&self) {
            let caller = self.env().caller();
            if let Some(balance) = self.reward_tracker.take(caller) {
                self.env().transfer(caller, balance);
            }
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// The below code is technically just normal Rust code.
    #[cfg(test)]
    mod tests {
        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        // /// We test if the default constructor does its job.
        // #[ink::test]
        // fn default_works() {
        //     let rps = Rps::default();
        //     assert_eq!(rps.get(), false);
        // }

        // /// We test a simple use case of our contract.
        // #[ink::test]
        // fn it_works() {
        //     let mut rps = Rps::new(false);
        //     assert_eq!(rps.get(), false);
        //     rps.flip();
        //     assert_eq!(rps.get(), true);
        // }
    }


    /// This is how you'd write end-to-end (E2E) or integration tests for ink! contracts.
    ///
    /// When running these you need to make sure that you:
    /// - Compile the tests with the `e2e-tests` feature flag enabled (`--features e2e-tests`)
    /// - Are running a Substrate node which contains `pallet-contracts` in the background
    #[cfg(all(test, feature = "e2e-tests"))]
    mod e2e_tests {
        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        /// A helper function used for calling contract messages.
        use ink_e2e::ContractsBackend;

        /// The End-to-End test `Result` type.
        type E2EResult<T> = std::result::Result<T, Box<dyn std::error::Error>>;

        // /// We test that we can upload and instantiate the contract using its default constructor.
        // #[ink_e2e::test]
        // async fn default_works(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
        //     // Given
        //     let mut constructor = RpsRef::default();

        //     // When
        //     let contract = client
        //         .instantiate("rps", &ink_e2e::alice(), &mut constructor)
        //         .submit()
        //         .await
        //         .expect("instantiate failed");
        //     let call_builder = contract.call_builder::<Rps>();

        //     // Then
        //     let get = call_builder.get();
        //     let get_result = client.call(&ink_e2e::alice(), &get).dry_run().await?;
        //     assert!(matches!(get_result.return_value(), false));

        //     Ok(())
        // }

        // /// We test that we can read and write a value from the on-chain contract.
        // #[ink_e2e::test]
        // async fn it_works(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
        //     // Given
        //     let mut constructor = RpsRef::new(false);
        //     let contract = client
        //         .instantiate("rps", &ink_e2e::bob(), &mut constructor)
        //         .submit()
        //         .await
        //         .expect("instantiate failed");
        //     let mut call_builder = contract.call_builder::<Rps>();

        //     let get = call_builder.get();
        //     let get_result = client.call(&ink_e2e::bob(), &get).dry_run().await?;
        //     assert!(matches!(get_result.return_value(), false));

        //     // When
        //     let flip = call_builder.flip();
        //     let _flip_result = client
        //         .call(&ink_e2e::bob(), &flip)
        //         .submit()
        //         .await
        //         .expect("flip failed");

        //     // Then
        //     let get = call_builder.get();
        //     let get_result = client.call(&ink_e2e::bob(), &get).dry_run().await?;
        //     assert!(matches!(get_result.return_value(), true));

        //     Ok(())
        // }
    }
}
