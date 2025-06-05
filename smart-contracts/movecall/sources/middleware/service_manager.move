// SPDX-License-Identifier: MIT
module movecall::service_manager_module {
    use std::string;
    use iota::event;
    use iota::transfer;
    use iota::coin;
    use iota::clock;
    use iota::table;
    use iota::tx_context::{Self, TxContext};

    use movecall::math_module;    
    use movecall::allocation_module;    
    use movecall::rewards_module::{Self, RewardsCoordinator};    
    use movecall::service_directory_module::{Self, ServiceDirectory};
    use movecall::delegation_module::{Self, DelegationManager};

    // Constants
    // BPS is the basis points for the multipliers of the strategies in the quorum
    const BPS: u64 = 10_000;

    // Errors
    const E_INVALID_QUORUM_WEIGHT: u64 = 0;
    const E_INSUFFICIENT_QUORUM_WEIGHT: u64 = 1;
    const E_OPERATOR_NOT_REGISTERED_TO_Service: u64 = 2;

    // Structs
    public struct Quorum has copy, drop, store {
        strategy_ids: vector<string::String>,
        multipliers: vector<u64>
    }

    public struct ServiceManager has key {
        id: UID,
        min_weights: table::Table<address, u64>,
        quorums: table::Table<address, Quorum>,
        total_operators: table::Table<address, u64>,
    }

    fun init(
        ctx: &mut TxContext
    ) {
        let service_manager = ServiceManager {
            id: object::new(ctx),
            min_weights: table::new<address, u64>(ctx),
            quorums: table::new<address, Quorum>(ctx),
            total_operators: table::new<address, u64>(ctx),
        };

        transfer::share_object(service_manager);
    }
    
    // Public functions
    public fun update_service_metadata_uri(
        service: address,
        metadata_uri: string::String
    ) {      
        service_directory_module::update_service_metadata_uri(
            service,
            metadata_uri
        )
    }

    public fun set_min_weight(
        service_manager: &mut ServiceManager,
        service: address,
        min_weight: u64
    ) {
        if (!table::contains(&service_manager.min_weights, service)) {
            table::add(&mut service_manager.min_weights, service, 0);
        };

        let mut current_weight = table::borrow_mut(&mut service_manager.min_weights, service);
        *current_weight = min_weight;
    }

    public fun set_quorum(
        service_manager: &mut ServiceManager,
        service: address,
        strategy_ids: vector<string::String>,
        multipliers: vector<u64>
    ) {
        let quorum = Quorum { strategy_ids, multipliers };

        validate_quorum(quorum);

        if (!table::contains(&service_manager.quorums, service)) {
            table::add(&mut service_manager.quorums, service, quorum);
        } else {
            let mut current_quorum = table::borrow_mut(&mut service_manager.quorums, service);
            *current_quorum = quorum;
        };
    }

    public fun register_operator_to_avs(
        service_manager: &mut ServiceManager,
        service_directory: &mut ServiceDirectory,
        delegation_manager: &DelegationManager,
        service: address,
        the_clock: &clock::Clock,
        ctx: &mut TxContext
    ) {
        let operator = tx_context::sender(ctx);
        let min_weight = get_min_weight(service_manager, service);
        let operator_weight = get_operator_weight(service_manager, delegation_manager, service, operator);

        assert!(operator_weight >= min_weight, E_INSUFFICIENT_QUORUM_WEIGHT);

        service_directory_module::register_operator_to_avs(
            service_directory,
            delegation_manager,
            service,
            operator,
            the_clock,
            ctx
        );

        if (!table::contains(&service_manager.total_operators, service)) {
            table::add(&mut service_manager.total_operators, service, 0);
        };

        let mut current_total_operators = table::borrow_mut(&mut service_manager.total_operators, service);
        *current_total_operators = *current_total_operators + 1;
    }

    public fun deregister_operator_from_avs(
        service_manager: &mut ServiceManager,
        service_directory: &mut ServiceDirectory,
        service: address,
        ctx: &mut TxContext
    ) {        
        let operator = tx_context::sender(ctx);

        service_directory_module::deregister_operator_from_avs(
            service_directory,
            service,
            operator,
            ctx
        );

        let mut current_total_operators = table::borrow_mut(&mut service_manager.total_operators, service);
        *current_total_operators = *current_total_operators - 1;
    }

    public fun is_operator_registered(
        service_directory: &ServiceDirectory,
        service: address,
        operator: address
    ): bool {
        service_directory_module::is_operator_registered(
            service_directory,
            service,
            operator
        )
    }

    public fun check_operator(
        service_manager: &ServiceManager,
        service_directory: &ServiceDirectory,
        delegation_manager: &DelegationManager,
        service: address,
        operator: address
    ) {
        assert!(is_operator_registered(
            service_directory, 
            service, 
            operator
        ), E_OPERATOR_NOT_REGISTERED_TO_Service);

        let min_weight = get_min_weight(service_manager, service);
        let operator_weight = get_operator_weight(service_manager, delegation_manager, service, operator);
      
        assert!(operator_weight >= min_weight, E_INSUFFICIENT_QUORUM_WEIGHT);
    }

    public fun get_min_weight(
        service_manager: &ServiceManager,
        service: address
    ): u64 {
        if (!table::contains(&service_manager.min_weights, service)) {
            return 0;
        };
        let min_weight = table::borrow(&service_manager.min_weights, service);
        *min_weight
    }

    public fun get_total_operators(
        service_manager: &ServiceManager,
        service: address
    ): u64 {
        if (!table::contains(&service_manager.total_operators, service)) {
            return 0;
        };
        let total_operators = table::borrow(&service_manager.total_operators, service);
        *total_operators
    }

    public fun get_quorum(
        service_manager: &ServiceManager,
        service: address
    ): Quorum {
        if (!table::contains(&service_manager.quorums, service)) {
            return Quorum { strategy_ids: vector::empty<string::String>(), multipliers: vector::empty<u64>() };
        };
        let quorum = table::borrow(&service_manager.quorums, service);
        *quorum
    }

    public fun get_operator_shares(
        delegation_manager: &DelegationManager,
        operator: address,
        strategy_ids: vector<string::String>
    ): vector<u64> {
        delegation_module::get_operator_shares(delegation_manager, operator, strategy_ids)
    }

    public fun get_operator_weight(
        service_manager: &ServiceManager,        
        delegation_manager: &DelegationManager,
        service: address,
        operator: address,
    ): u64 {
        if (!table::contains(&service_manager.quorums, service)) {
            return 0;
        };
        let quorum = table::borrow(&service_manager.quorums, service);
        let shares = get_operator_shares(
            delegation_manager,
            operator,
            quorum.strategy_ids
        );

        let mut operator_weight: u64 = 0;

        let mut i: u64 = 0;
        let len = vector::length(&quorum.multipliers);

        while (i < len) {
            operator_weight = operator_weight + (*vector::borrow(&quorum.multipliers, i) * *vector::borrow(&shares, i));
            i = i + 1;
        };

        math_module::div(operator_weight, BPS)
    }

    fun validate_quorum(
        quorum: Quorum,
    ) {
        let mut total_multiplier: u64 = 0;

        assert!(vector::length(&quorum.strategy_ids) == vector::length(&quorum.multipliers), E_INVALID_QUORUM_WEIGHT);

        let mut i: u64 = 0;
        let len = vector::length(&quorum.multipliers);

        while (i < len) {
            total_multiplier = total_multiplier + *vector::borrow(&quorum.multipliers, i);
            i = i + 1;
        };

        assert!(total_multiplier == BPS, E_INVALID_QUORUM_WEIGHT);
    }

    #[test_only]
    public(package) fun init_for_testing(
        ctx: &mut TxContext
    ) {
        init(ctx);
    }
}