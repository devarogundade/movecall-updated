// SPDX-License-Identifier: MIT
module movecall::ankriota {
    use std::option;
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};
    use iota::balance::{Self, Balance};

    public struct ANKRIOTA has drop {}

    public struct Faucet<phantom ANKRIOTA> has key {
        id: UID,
        balance: Balance<ANKRIOTA>
    }

    fun init(
        witness: ANKRIOTA,
        ctx: &mut TxContext
    ) {
        let (treasury, metadata) = coin::create_currency(
            witness, 
            9, 
            b"ankrIOTA", 
            b"ANKR Staked IOTA", 
            b"", 
            option::none(), 
            ctx
        );

        let faucet = Faucet {
            id: object::new(ctx),
            balance: balance::zero<ANKRIOTA>()
        };

        transfer::share_object(faucet);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx))
    }

    public entry fun init_supply<ANKRIOTA>(
        treasury_cap: &mut TreasuryCap<ANKRIOTA>,
        faucet: &mut Faucet<ANKRIOTA>, 
        ctx: &mut TxContext,
    ) {
        let coin_minted = coin::mint(treasury_cap, 1_000_000_000_000_000, ctx);
        balance::join<ANKRIOTA>(&mut faucet.balance, coin_minted.into_balance<ANKRIOTA>());
    }

    public entry fun mint<ANKRIOTA>(
        faucet: &mut Faucet<ANKRIOTA>,
        amount: u64,
        receiver: address,
        ctx: &mut TxContext,
    ) {
        let coin_took = coin::take<ANKRIOTA>(&mut faucet.balance, amount, ctx);
        transfer::public_transfer(coin_took, receiver)
    }
}