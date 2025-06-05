// SPDX-License-Identifier: MIT
module movecall::doge {
    use std::option;
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};
    use iota::balance::{Self, Balance};

    public struct DOGE has drop {}

    public struct Faucet<phantom DOGE> has key {
        id: UID,
        balance: Balance<DOGE>
    }

    fun init(
        witness: DOGE,
        ctx: &mut TxContext
    ) {
        let (treasury, metadata) = coin::create_currency(
            witness, 
            9, 
            b"DOGE", 
            b"Dogecoin", 
            b"", 
            option::none(), 
            ctx
        );

        let faucet = Faucet {
            id: object::new(ctx),
            balance: balance::zero<DOGE>()
        };

        transfer::share_object(faucet);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx))
    }

    public entry fun init_supply<DOGE>(
        treasury_cap: &mut TreasuryCap<DOGE>,
        faucet: &mut Faucet<DOGE>, 
        ctx: &mut TxContext,
    ) {
        let coin_minted = coin::mint(treasury_cap, 1_000_000_000_000_000, ctx);
        balance::join<DOGE>(&mut faucet.balance, coin_minted.into_balance<DOGE>());
    }

    public entry fun mint<DOGE>(
        faucet: &mut Faucet<DOGE>,
        amount: u64,
        receiver: address,
        ctx: &mut TxContext,
    ) {
        let coin_took = coin::take<DOGE>(&mut faucet.balance, amount, ctx);
        transfer::public_transfer(coin_took, receiver)
    }
}