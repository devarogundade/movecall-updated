module movecall::movecall_bridge {
    use std::string;
    use iota::event;
    use iota::table;
    use iota::balance;
    use iota::coin;
    use iota::bag;
    use iota::clock;
    use iota::bcs;
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};
    use iota::ed25519;

    use movecall::math_module;
    use movecall::utils_module;
    use movecall::service_manager_module::{Self, ServiceManager};
    use movecall::service_directory_module::{ServiceDirectory};
    use movecall::delegation_module::{Self, DelegationManager};

    // Constants
    const MIN_ATTESTATIONS: u64 = 2;

    // Errors
    const E_ALREADY_CLAIMED: u64 = 1;
    const E_ALREADY_ATTESTED: u64 = 2;
    const E_INVALID_SIGNATURE: u64 = 3;
    const E_WRONG_SALT: u64 = 4;

    // Structs
    public struct Claim has copy, store {
        source_uid: vector<u8>,
        source_chain: u64,
        source_block_number: u64,
        amount: u64,
        receiver: address,
        attestations: vector<address>,
        claimed: bool
    }

    public struct Pool<phantom CoinType> has store {
        balance_underlying: balance::Balance<CoinType>
    }

    public struct MoveCallBridge has key {
        id: UID,
        min_attestations: u64,
        pools: bag::Bag,
        claims: table::Table<vector<u8>, Claim>
    }

    public struct MoveCallBridgeCap has key { 
        id: UID
    }

    // Events
    public struct ClaimAttested has copy, drop {
        claim_root: vector<u8>,
        claimed: bool,
        operator: address
    }

    fun init(
        ctx: &mut TxContext
    ) {
        let movecall_bridge = MoveCallBridge { 
            id: object::new(ctx),
            min_attestations: MIN_ATTESTATIONS,
            pools: bag::new(ctx),
            claims: table::new<vector<u8>, Claim>(ctx)
        };

        transfer::share_object(movecall_bridge);

        let cap = MoveCallBridgeCap { 
            id: object::new(ctx) 
        };

        transfer::transfer(cap, tx_context::sender(ctx));

        service_manager_module::update_service_metadata_uri(
            @movecall_bridge,
            string::utf8(b"https://movecall_bridge.netlify.app/metadata.json"),
        );
    }

    public fun set_required_operator_weight(
        service_manager: &mut ServiceManager,
        cap: &MoveCallBridgeCap,
        min_weight: u64
    ) {
        service_manager_module::set_min_weight(service_manager, @movecall_bridge, min_weight)
    }

    public fun set_quorum(
        service_manager: &mut ServiceManager,
        cap: &MoveCallBridgeCap,
        strategy_ids: vector<string::String>,
        weights: vector<u64>
    ) {
        service_manager_module::set_quorum(service_manager, @movecall_bridge, strategy_ids, weights)
    }

    public entry fun deposit<CoinType>(
        movecall_bridge: &mut MoveCallBridge,
        cap: &MoveCallBridgeCap,
        coin_deposited: coin::Coin<CoinType>,
        ctx: &mut TxContext
    ) {
        let coin_type = utils_module::get_strategy_id<CoinType>();
        if (!bag::contains(&movecall_bridge.pools, coin_type)) {
            bag::add(&mut movecall_bridge.pools, coin_type, Pool<CoinType> {
                balance_underlying: balance::zero<CoinType>()
            });
        };
        let mut pool = bag::borrow_mut<string::String, Pool<CoinType>>(&mut movecall_bridge.pools, coin_type);
        let balance_deposited = coin::into_balance(coin_deposited);
        balance::join(&mut pool.balance_underlying, balance_deposited);
    }

    public entry fun withdraw<CoinType>(
        movecall_bridge: &mut MoveCallBridge,
        cap: &MoveCallBridgeCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin_type = utils_module::get_strategy_id<CoinType>();
        let mut pool = bag::borrow_mut<string::String, Pool<CoinType>>(&mut movecall_bridge.pools, coin_type);
        let balance_withdrawn = balance::split(&mut pool.balance_underlying, amount);
        let coin_withdrawn = coin::from_balance(balance_withdrawn, ctx);
        transfer::public_transfer(coin_withdrawn, tx_context::sender(ctx));
    }

    public entry fun register_operator(
        service_manager: &mut ServiceManager,
        service_directory: &mut ServiceDirectory,
        delegation_manager: &DelegationManager,
        the_clock: &clock::Clock,
        ctx: &mut TxContext
    ) {
        service_manager_module::register_operator_to_avs(
            service_manager,
            service_directory,
            delegation_manager,
            @movecall_bridge,
            the_clock,
            ctx
        )
    }

    public entry fun attest<CoinType>(
        movecall_bridge: &mut MoveCallBridge,
        coin_metadata: &coin::CoinMetadata<CoinType>,
        service_manager: &ServiceManager,
        service_directory: &ServiceDirectory,
        delegation_manager: &DelegationManager,
        signatures: vector<vector<u8>>,
        signers: vector<address>,
        source_uid: vector<u8>,
        source_chain: u64,
        source_block_number: u64,
        amount: u64,
        decimals: u8,
        receiver: address,
        the_clock: &clock::Clock,
        ctx: &mut TxContext,
    ) {
        let mut i = 0;
        let len = vector::length(&signatures);
        while (i < len) {
            let signature = *vector::borrow(&signatures, i);
            let signer = *vector::borrow(&signers, i);
            
            attest_impl<CoinType>(
                movecall_bridge,
                coin_metadata,
                service_manager,
                service_directory,
                delegation_manager,
                signer,
                source_uid,
                source_chain,
                source_block_number,
                amount,
                decimals,
                receiver,
                the_clock,
                ctx
            );

            i = i + 1;
        };
    }

    fun attest_impl<CoinType>(
        movecall_bridge: &mut MoveCallBridge,
        coin_metadata: &coin::CoinMetadata<CoinType>,
        service_manager: &ServiceManager,
        service_directory: &ServiceDirectory,
        delegation_manager: &DelegationManager,
        operator: address,
        source_uid: vector<u8>,
        source_chain: u64,
        source_block_number: u64,
        amount: u64,
        decimals: u8,
        receiver: address,
        the_clock: &clock::Clock,
        ctx: &mut TxContext,
    ) {
        service_manager_module::check_operator(
            service_manager,
            service_directory,
            delegation_manager,
            @movecall_bridge,
            operator
        );     

        let claim_root = get_claim_root(source_uid, source_chain, source_block_number, amount, decimals, receiver);

        if (!table::contains(&movecall_bridge.claims, claim_root)) {
            table::add(&mut movecall_bridge.claims, claim_root, Claim {
                source_uid,
                source_chain,
                source_block_number,
                amount,
                receiver,
                attestations: vector::empty<address>(),
                claimed: false
            });
        };

        let mut claim = table::borrow_mut(&mut movecall_bridge.claims, claim_root);

        // Check if the claim is already attested by operator
        assert!(!vector::contains(&claim.attestations, &operator), E_ALREADY_ATTESTED);

        // Attest the claim
        vector::push_back(&mut claim.attestations, operator);

        if (claim.claimed) {
            return;
        } else if (!claim.claimed && vector::length(&claim.attestations) >= movecall_bridge.min_attestations) {
            let coin_type = utils_module::get_strategy_id<CoinType>();
            let pool = bag::borrow_mut<string::String, Pool<CoinType>>(&mut movecall_bridge.pools, coin_type);
            let coin_decimals = coin::get_decimals(coin_metadata);
            let amount_claimed = math_module::scale(amount, decimals, coin_decimals);
            let balance_claimed = balance::split(&mut pool.balance_underlying, amount_claimed);
            let coin_claimed = coin::from_balance(balance_claimed, ctx);
            transfer::public_transfer(coin_claimed, receiver);

            event::emit(ClaimAttested {
                claim_root,
                claimed: true,
                operator: operator
            });
            
            claim.claimed = true;
        } else {
            event::emit(ClaimAttested {
                claim_root,
                claimed: false,
                operator: operator
            });
        };      
    }

    public entry fun set_min_attestations(
        movecall_bridge: &mut MoveCallBridge,
        cap: &MoveCallBridgeCap,
        min_attestations: u64,
        ctx: &mut TxContext
    ) {
        movecall_bridge.min_attestations = min_attestations;
    }

    public fun get_claim_root(
        source_uid: vector<u8>,
        source_chain: u64,
        source_block_number: u64,
        amount: u64,
        decimals: u8,
        receiver: address
    ): vector<u8> {
        let mut root = vector::empty<u8>();
        vector::append(&mut root, source_uid);
        vector::append(&mut root, bcs::to_bytes(&source_chain));
        vector::append(&mut root, bcs::to_bytes(&source_block_number));
        vector::append(&mut root, bcs::to_bytes(&amount));
        vector::append(&mut root, bcs::to_bytes(&decimals));
        vector::append(&mut root, bcs::to_bytes(&receiver));
        root
    }

    #[test_only]
    public(package) fun init_for_testing(
        ctx: &mut TxContext,
    ) {
        init(ctx)
    }

    #[test_only]
    public fun verify_simple_sig(
        signature: vector<u8>,
        signer: address,
        msg: vector<u8>
    ): bool {
        ed25519::ed25519_verify(&signature, &bcs::to_bytes(&signer), &msg)
    }
}
