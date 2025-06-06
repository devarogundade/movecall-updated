// SPDX-License-Identifier: MIT
module movecall::allocation_module {
    use std::option;
    use std::string;
    use std::vector;
    use iota::balance;
    use iota::coin;
    use iota::event;
    use iota::transfer;
    use iota::table;
    use iota::bcs;
    use iota::tx_context::{Self, TxContext};

    use movecall::math_module;
    use movecall::strategy_manager_module::{StrategyManager};

    // Constants
    const WAD: u64 = 1_000_000_000;

    // Error codes
    const E_INPUT_ARRAY_LENGTH_MISMATCH: u64 = 1;
    const E_INVALID_OPERATOR_SET: u64 = 2;
    const E_OPERATOR_NOT_SLASHABLE: u64 = 3;
    const E_STRATEGIES_MUST_BE_IN_ASCENDING_ORDER: u64 = 4;
    const E_INVALID_WAD_TO_SLASH: u64 = 5;
    const E_STRATEGY_NOT_IN_OPERATOR_SET: u64 = 6;
    const E_INSUFFICIENT_MAGNITUDE: u64 = 7;
    const E_ALREADY_MEMBER_OF_SET: u64 = 8;
    const E_INVALID_CALLER: u64 = 9;
    const E_UNINITIALIZED_ALLOCATION_DELAY: u64 = 10;
    const E_NOT_MEMBER_OF_SET: u64 = 11;
    const E_INVALID_OPERATOR: u64 = 12;
    const E_INVALID_Service_REGISTRAR: u64 = 13;
    const E_NONEXISTENT_Service_METADATA: u64 = 14;
    const E_STRATEGY_ALREADY_IN_OPERATOR_SET: u64 = 15;
    const E_MODIFICATION_PENDING: u64 = 16;
    const E_SAME_MAGNITUDE: u64 = 17;
    const E_PAUSED: u64 = 18;

    // Structs
    public struct OperatorSet has copy, drop {
        service: address,
        id: u64,
    }

    public struct Allocation has copy, drop, store {
        current_magnitude: u64,
        pending_diff: u64,
        effect_block: u64,
    }

    public struct Snapshot has copy, drop, store {
        block_number: u64,
        max_magnitude: u64,
    }

    public struct StrategyInfo has copy, drop {
        max_magnitude: u64,
        encumbered_magnitude: u64,
    }

    public struct RegistrationStatus has copy, drop, store {
        registered: bool,
        slashable_until: u64
    }

    public struct AllocationDelayInfo has copy, drop, store {
        delay: u64,
        pending_delay: u64,
        effect_block: u64,
        is_set: bool,
    }

    public struct SlashingParams has copy, drop, store {
        operator: address,
        operator_set_id: u64,
        strategy_id: string::String,
        wad_to_slash: u64,
        description: string::String,
    }

    public struct AllocateParams has copy, drop {
        operator_set: OperatorSet,
        strategy_ids: vector<string::String>,
        new_magnitudes: vector<u64>,
    }

    public struct RegisterParams has copy, drop {
        service: address,
        operator_set_ids: vector<u64>,
        data: vector<u8>,
    }

    public struct DeregisterParams has copy, drop {
        operator: address,
        service: address,
        operator_set_ids: vector<u64>,
    }

    public struct CreateSetParams has copy, drop {
        operator_set_id: u64,
        strategy_ids: vector<string::String>,
    }

    public struct AllocationManager has key {
        id: UID,
        is_paused: bool,
        operator_sets: table::Table<address, vector<u64>>,
        operator_set_strategies: table::Table<vector<u8>, vector<string::String>>,
        allocated_sets: table::Table<address, vector<vector<u8>>>,
        allocated_strategies: table::Table<address, table::Table<vector<u8>, vector<string::String>>>,
        allocations: table::Table<address, table::Table<vector<u8>, table::Table<string::String, Allocation>>>,
        max_magnitude_snapshots: table::Table<address, table::Table<string::String, vector<Snapshot>>>,
        encumbered_magnitudes: table::Table<address, table::Table<string::String, u64>>,
        registration_status: table::Table<address, table::Table<vector<u8>, RegistrationStatus>>,
        allocation_delay_info: table::Table<address, AllocationDelayInfo>,
    }

    // Events
    public struct OperatorSlashed has copy, drop {
        operator: address,
        operator_set: OperatorSet,
        strategy_id: string::String,
        wad_slashed: vector<u64>,
        description: string::String,
    }

    public struct AllocationUpdated has copy, drop {
        operator: address,
        operator_set: OperatorSet,
        strategy_id: string::String,
        magnitude: u64,
        effect_block: u64,
    }

    public struct EncumberedMagnitudeUpdated has copy, drop {
        operator: address,
        strategy_id: string::String,
        magnitude: u64,
    }

    public struct MaxMagnitudeUpdated has copy, drop {
        operator: address,
        strategy_id: string::String,
        magnitude: u64,
    }

    public struct OperatorAddedToOperatorSet has copy, drop {
        operator: address,
        operator_set: OperatorSet,
    }

    public struct OperatorRemovedFromOperatorSet has copy, drop {
        operator: address,
        operator_set: OperatorSet,
    }

    public struct AllocationDelaySet has copy, drop {
        operator: address,
        delay: u64,
        effect_block: u64,
    }

    public struct ServiceMetadataURIUpdated has copy, drop {
        service: address,
        metadata_uri: string::String,
    }

    public struct OperatorSetCreated has copy, drop {
        operator_set: OperatorSet,
    }

    public struct StrategyAddedToOperatorSet has copy, drop {
        operator_set: OperatorSet,
        strategy_id: string::String,
    }

    public struct StrategyRemovedFromOperatorSet has copy, drop {
        operator_set: OperatorSet,
        strategy_id: string::String,
    }

    // Initialization
    fun init(
        ctx: &mut TxContext
    ) {
        let allocation_manager = AllocationManager {
            id: object::new(ctx),
            is_paused: false,
            operator_sets: table::new<address, vector<u64>>(ctx),
            operator_set_strategies: table::new<vector<u8>, vector<string::String>>(ctx),
            allocated_sets: table::new<address, vector<vector<u8>>>(ctx),
            allocated_strategies: table::new<address, table::Table<vector<u8>, vector<string::String>>>(ctx),
            allocations: table::new<address, table::Table<vector<u8>, table::Table<string::String, Allocation>>>(ctx),
            max_magnitude_snapshots: table::new<address, table::Table<string::String, vector<Snapshot>>>(ctx),
            encumbered_magnitudes: table::new<address, table::Table<string::String, u64>>(ctx),
            registration_status: table::new<address, table::Table<vector<u8>, RegistrationStatus>>(ctx),
            allocation_delay_info: table::new<address, AllocationDelayInfo>(ctx),
        };

        transfer::share_object(allocation_manager);
    }

    // Package functions
    public(package) fun slash_operator_shares(
        strategy_manager: &mut StrategyManager,
        allocation_manager: &mut AllocationManager,
        service: address,
        params: SlashingParams,
        ctx: &mut TxContext
    ): (u64, u64) {
        check_not_paused(allocation_manager);

        let operator_set = OperatorSet { service, id: params.operator_set_id };
        assert!(operator_set_exists(allocation_manager, operator_set), E_INVALID_OPERATOR_SET);
        assert!(is_operator_slashable(allocation_manager, params.operator, operator_set, ctx), E_OPERATOR_NOT_SLASHABLE);

        let mut wad_slashed = vector::empty<u64>();

        assert!(0 < params.wad_to_slash && params.wad_to_slash <= WAD, E_INVALID_WAD_TO_SLASH);
        assert!(operator_set_contains_strategy(allocation_manager, operator_set, params.strategy_id), E_STRATEGY_NOT_IN_OPERATOR_SET);

        let (mut info, mut allocation) = get_updated_allocation(
            allocation_manager,
            params.operator,
            operator_set,
            params.strategy_id,
            ctx
        );

        if (allocation.current_magnitude == 0) {
            vector::push_back(&mut wad_slashed, 0);
            return (0, info.max_magnitude);
        };

        let slashed_magnitude = math_module::mul_div(allocation.current_magnitude, params.wad_to_slash, WAD);
        let prev_max_magnitude = info.max_magnitude;
        let wad_slash = math_module::mul_div(slashed_magnitude, WAD, info.max_magnitude);
        vector::push_back(&mut wad_slashed, wad_slash);

        allocation.current_magnitude = allocation.current_magnitude - slashed_magnitude;
        info.max_magnitude = info.max_magnitude - slashed_magnitude;
        info.encumbered_magnitude = info.encumbered_magnitude - slashed_magnitude;

        if (allocation.pending_diff < 0) {
            let slashed_pending = math_module::mul_div(allocation.pending_diff, params.wad_to_slash, WAD);
            allocation.pending_diff = allocation.pending_diff - slashed_pending;
        };

        update_allocation_info(
            allocation_manager,
            params.operator,
            operator_set,
            params.strategy_id,
            info,
            allocation,
            ctx
        );

        update_max_magnitude(allocation_manager, params.operator, params.strategy_id, info.max_magnitude, ctx);

        event::emit(OperatorSlashed {
            operator: params.operator,
            operator_set,
            strategy_id: params.strategy_id,
            wad_slashed,
            description: params.description,
        });

        (prev_max_magnitude, info.max_magnitude)
    }

    // Internal helper functions
    fun operator_set_exists(
        allocation_manager: &AllocationManager,
        operator_set: OperatorSet
    ): bool {
        if (!table::contains(&allocation_manager.operator_sets, operator_set.service)) {
            return false;
        };
        let sets = table::borrow(&allocation_manager.operator_sets, operator_set.service);
        vector::contains(sets, &operator_set.id)
    }

    fun operator_set_contains_strategy(
        allocation_manager: &AllocationManager,
        operator_set: OperatorSet,
        strategy_id: string::String
    ): bool {
        let key = operator_set_key(operator_set);
        if (!table::contains(&allocation_manager.operator_set_strategies, key)) {
            return false;
        };
        let strategy_ids = table::borrow(&allocation_manager.operator_set_strategies, key);
        vector::contains(strategy_ids, &strategy_id)
    }

    fun operator_set_key(operator_set: OperatorSet): vector<u8> {
        let mut key = vector::empty<u8>();
        vector::append(&mut key, bcs::to_bytes<address>(&operator_set.service));
        vector::append(&mut key, bcs::to_bytes<u64>(&operator_set.id));
        key
    }

    fun get_updated_allocation(
        allocation_manager: &AllocationManager,
        operator: address,
        operator_set: OperatorSet,
        strategy_id: string::String,
        ctx: &mut TxContext
    ): (StrategyInfo, Allocation) {
        let max_magnitude = get_max_magnitude(allocation_manager, operator, strategy_id, 0);
        
        let encumbered_magnitude = if (table::contains(&allocation_manager.encumbered_magnitudes, operator) &&
            table::contains(table::borrow(&allocation_manager.encumbered_magnitudes, operator), strategy_id)) {
            *table::borrow(table::borrow(&allocation_manager.encumbered_magnitudes, operator), strategy_id)
        } else {
            0
        };

        let mut info = StrategyInfo { max_magnitude, encumbered_magnitude };

        let mut allocation = if (table::contains(&allocation_manager.allocations, operator) &&
            table::contains(table::borrow(&allocation_manager.allocations, operator), operator_set_key(operator_set)) &&
            table::contains(table::borrow(table::borrow(&allocation_manager.allocations, operator), operator_set_key(operator_set)), strategy_id)) {
            *table::borrow(table::borrow(table::borrow(&allocation_manager.allocations, operator), operator_set_key(operator_set)), strategy_id)
        } else {
            Allocation { current_magnitude: 0, pending_diff: 0, effect_block: 0 }
        };

        if (tx_context::epoch(ctx) < allocation.effect_block) {
            return (info, allocation);
        };

        allocation.current_magnitude = allocation.current_magnitude + allocation.pending_diff;
        if (allocation.pending_diff < 0) {
            info.encumbered_magnitude = info.encumbered_magnitude + allocation.pending_diff;
        };
        allocation.effect_block = 0;
        allocation.pending_diff = 0;

        (info, allocation)
    }

    fun update_allocation_info(
        allocation_manager: &mut AllocationManager,
        operator: address,
        operator_set: OperatorSet,
        strategy_id: string::String,
        info: StrategyInfo,
        allocation: Allocation,
        ctx: &mut TxContext
    ) {
        // Update encumbered magnitude
        if (!table::contains(&allocation_manager.encumbered_magnitudes, operator)) {
            table::add(&mut allocation_manager.encumbered_magnitudes, operator, table::new<string::String, u64>(ctx));
        };
        let mut operator_encumbered_magnitudes = table::borrow_mut(&mut allocation_manager.encumbered_magnitudes, operator);
        if (!table::contains(operator_encumbered_magnitudes, strategy_id)) {
            table::add(operator_encumbered_magnitudes, strategy_id, 0);
        };
        let mut max_magnitude = table::borrow_mut(operator_encumbered_magnitudes, strategy_id);
        *max_magnitude = info.max_magnitude;

        // Update allocation
        if (!table::contains(&allocation_manager.allocations, operator)) {
            table::add(&mut allocation_manager.allocations, operator, table::new<vector<u8>, table::Table<string::String, Allocation>>(ctx));
        };
        let operator_allocations = table::borrow_mut(&mut allocation_manager.allocations, operator);
        let set_key = operator_set_key(operator_set);
        if (!table::contains(operator_allocations, set_key)) {
            table::add(operator_allocations, set_key, table::new<string::String, Allocation>(ctx));
        };
        let set_allocations = table::borrow_mut(operator_allocations, set_key);
        if (!table::contains(set_allocations, strategy_id)) {
            table::add(set_allocations, strategy_id, allocation);
        } else {
            let mut prev_allocation = table::borrow_mut(set_allocations, strategy_id);
            *prev_allocation = allocation;
        };      

        // Update allocated sets and strategy_ids
        if (allocation.pending_diff != 0) {
            if (!table::contains(&allocation_manager.allocated_sets, operator)) {
                table::add(&mut allocation_manager.allocated_sets, operator, vector::empty<vector<u8>>());
            };
            let mut allocated_sets = table::borrow_mut(&mut allocation_manager.allocated_sets, operator);
            if (!vector::contains(allocated_sets, &set_key)) {
                vector::push_back(allocated_sets, set_key);
            };
            if (!table::contains(&allocation_manager.allocated_strategies, operator)) {
                table::add(&mut allocation_manager.allocated_strategies, operator, table::new<vector<u8>, vector<string::String>>(ctx));
            };
            let mut allocated_strategies = table::borrow_mut(&mut allocation_manager.allocated_strategies, operator);
            if (!table::contains(allocated_strategies, set_key)) {
                table::add(allocated_strategies, set_key, vector::empty<string::String>());
            };
            let mut set_strategies = table::borrow_mut(allocated_strategies, set_key);
            if (!vector::contains(set_strategies, &strategy_id)) {
                vector::push_back(set_strategies, strategy_id);
            };
        } else if (allocation.current_magnitude == 0) {
            if (table::contains(&allocation_manager.allocated_strategies, operator)) {
                let mut allocated_strategies = table::borrow_mut(&mut allocation_manager.allocated_strategies, operator);
                if (table::contains(allocated_strategies, set_key)) {
                    let mut set_strategies = table::borrow_mut(allocated_strategies, set_key);
                    if (vector::is_empty(set_strategies)) {
                        table::remove(allocated_strategies, set_key);
                    } else {
                        let i = vector::find_index!(set_strategies, |id| id == &strategy_id);
                        vector::remove(set_strategies, *option::borrow(&i));
                    };
                };
            };

            if (table::contains(&allocation_manager.allocated_sets, operator)) {
                let mut allocated_sets = table::borrow_mut(&mut allocation_manager.allocated_sets, operator);
                if (!vector::is_empty(allocated_sets)) {
                    let i = vector::find_index!(allocated_sets, |key| key == &set_key);
                    vector::remove(allocated_sets, *option::borrow(&i));
                };
            };
        };
    }

    fun update_max_magnitude(
        allocation_manager: &mut AllocationManager, 
        operator: address, 
        strategy_id: string::String, 
        max_magnitude: u64,
        ctx: &mut TxContext
    ) {
        if (!table::contains(&allocation_manager.max_magnitude_snapshots, operator)) {
            table::add(&mut allocation_manager.max_magnitude_snapshots, operator, table::new<string::String, vector<Snapshot>>(ctx))
        };
        let max_magnitude_snapshots = table::borrow_mut(&mut allocation_manager.max_magnitude_snapshots, operator);
        if (!table::contains(max_magnitude_snapshots, strategy_id)) {
            table::add(max_magnitude_snapshots, strategy_id, vector::empty<Snapshot>());
        };
        let max_magnitudes = table::borrow_mut(max_magnitude_snapshots, strategy_id);
        
        vector::push_back(max_magnitudes, Snapshot { 
            block_number: tx_context::epoch(ctx), 
            max_magnitude 
        });
    }

    fun check_not_paused(
        allocation_manager: &AllocationManager
    ) {
        assert!(!allocation_manager.is_paused, E_PAUSED);
    }

    // View functions
    public fun get_max_magnitudes(
        allocation_manager: &AllocationManager,
        operator: address,
        strategy_ids: vector<string::String>,
        min_block: u64
    ): vector<u64> {
        let mut max_magnitudes = vector::empty<u64>();

        let mut i = 0;
        let len = vector::length(&strategy_ids);
        while (i < len) {
            let strategy_id = *vector::borrow(&strategy_ids, i);
            vector::push_back(
                &mut max_magnitudes,
                get_max_magnitude(allocation_manager, operator, strategy_id, min_block)
            );
            i = i + 1;
        };
        
        max_magnitudes
    }

    public fun get_max_magnitude(
        allocation_manager: &AllocationManager,
        operator: address,
        strategy_id: string::String,
        min_block: u64
    ): u64 {
        if (!table::contains(&allocation_manager.max_magnitude_snapshots, operator)) {
            return WAD;
        };
        let staker_snapshots = table::borrow(&allocation_manager.max_magnitude_snapshots, operator);
        if (!table::contains(staker_snapshots, strategy_id)) {
            return WAD;
        };
        let snapshots = table::borrow(staker_snapshots, strategy_id);
        if (vector::is_empty(snapshots)) {
            return WAD;
        };
        if (min_block == 0) {
            let latest_snaphot = vector::borrow(snapshots, vector::length(snapshots) - 1);
            return latest_snaphot.max_magnitude;
        };
        
        let mut max_magnitude: u64 = WAD;

        let mut i = 0;
        let len = vector::length(snapshots);
        while (i < len) {
            let snapshot = vector::borrow(snapshots, i);
            if (snapshot.block_number >= min_block && snapshot.max_magnitude > max_magnitude) {
                max_magnitude = snapshot.max_magnitude;
            };
            i = i + 1;
        };

        max_magnitude
    }

    public fun is_operator_slashable(
        allocation_manager: &AllocationManager,
        operator: address,
        operator_set: OperatorSet,
        ctx: &mut TxContext
    ): bool {
        if (!table::contains(&allocation_manager.registration_status, operator)) {
            return false;
        };
        let registration_status = table::borrow(&allocation_manager.registration_status, operator);
        if (!table::contains(registration_status, operator_set_key(operator_set))) {
            return false;
        };
        let status = *table::borrow(registration_status, operator_set_key(operator_set));
        status.registered || tx_context::epoch(ctx) <= status.slashable_until
    }

    public fun get_allocation_delay(
        allocation_manager: &AllocationManager,
        operator: address,
        ctx: &mut TxContext
    ): (bool, u64) {
        if (!table::contains(&allocation_manager.allocation_delay_info, operator)) {
            return (false, 0);
        };
        let info = *table::borrow(&allocation_manager.allocation_delay_info, operator);

        if (info.effect_block != 0 && tx_context::epoch(ctx) >= info.effect_block) {
            return (true, info.pending_delay);
        };

        (info.is_set, info.delay)
    }

    public fun params_to_operator_and_strategy_id(
        params: SlashingParams
    ): (address, string::String) {
        (params.operator, params.strategy_id)
    }

    #[test_only]
    public(package) fun init_for_testing(
        ctx: &mut TxContext,
    ) {
        init(ctx)
    }
}