// SPDX-License-Identifier: MIT
module movecall::deeplayer_module {
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};

    // Struct
    public struct MoveCallCap has key {
        id: UID
    }

    fun init(
        ctx: &mut TxContext
    ) {
        let cap = MoveCallCap { 
            id: object::new(ctx) 
        };

        transfer::transfer(cap, tx_context::sender(ctx));
    }

    #[test_only]
    public(package) fun init_for_testing(
        ctx: &mut TxContext
    ) {
        init(ctx);
    }
}
