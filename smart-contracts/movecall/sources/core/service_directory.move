// SPDX-License-Identifier: MIT
module movecall::service_directory_module {
    use std::string;
    use iota::event;
    use iota::transfer;
    use iota::table;
    use iota::clock;
    use iota::tx_context::{Self, TxContext};

    use movecall::strategy_manager_module::{StrategyManager};
    use movecall::delegation_module::{Self, DelegationManager};

    // Constants
    const OPERATOR_Service_REG_UNREGISTERED: u64 = 0;
    const OPERATOR_Service_REG_REGISTERED: u64 = 1;

    // Errors
    const E_OPERATOR_ALREADY_REGISTERED_TO_Service: u64 = 0;
    const E_OPERATOR_NOT_REGISTERED_TO_Service: u64 = 1;
    const E_INVALID_SIGNATURE: u64 = 3;
    const E_SALT_SPENT: u64 = 4;
    const E_OPERATOR_NOT_REGISTERED: u64 = 5;

    // Structs
    public struct ServiceDirectory has key {
        id: UID,
        service_operator_status: table::Table<address, table::Table<address, u64>>
    }

    // Events
    public struct ServiceMetadataURIUpdated has copy, drop {
        service: address,
        metadata_uri: string::String,
    }

    public struct OperatorServiceRegistrationStatusUpdated has copy, drop {
        operator: address,
        service: address,
        status: u64,
    }

    fun init(
        ctx: &mut TxContext
    ) {
        let service_directory = ServiceDirectory {
            id: object::new(ctx),
            service_operator_status: table::new<address, table::Table<address, u64>>(ctx)
        };

        transfer::share_object(service_directory);
    }

    // Package functions
    public(package) fun update_service_metadata_uri(
        service: address,
        metadata_uri: string::String
    ) {             
        event::emit(ServiceMetadataURIUpdated {
            service,
            metadata_uri,
        });
    }

    public(package) fun register_operator_to_avs(
        service_directory: &mut ServiceDirectory,
        delegation_manager: &DelegationManager,
        service: address,
        operator: address,
        the_clock: &clock::Clock,
        ctx: &mut TxContext
    ) {        
        // Check if operator is already registered
        if (!table::contains(&service_directory.service_operator_status, service)) {
            table::add(&mut service_directory.service_operator_status, service, table::new<address, u64>(ctx));
        };
        let mut operator_status = table::borrow_mut(&mut service_directory.service_operator_status, service);
        if (!table::contains(operator_status, operator)) {
            table::add(operator_status, operator, OPERATOR_Service_REG_UNREGISTERED);
        };

        let mut status = table::borrow_mut(operator_status, operator);
        assert!(*status != OPERATOR_Service_REG_REGISTERED, E_OPERATOR_ALREADY_REGISTERED_TO_Service);
    
        let is_operator = delegation_module::is_operator(delegation_manager, operator);
        assert!(is_operator, E_OPERATOR_NOT_REGISTERED);
        
        *status = OPERATOR_Service_REG_REGISTERED;       

        event::emit(OperatorServiceRegistrationStatusUpdated {
            operator,
            service,
            status: OPERATOR_Service_REG_REGISTERED,
        });
    }

    public(package) fun deregister_operator_from_avs(
        service_directory: &mut ServiceDirectory,
        service: address,
        operator: address,
        ctx: &mut TxContext
    ) {        
        // Check if operator is not registered
        if (!table::contains(&service_directory.service_operator_status, service)) {
            table::add(&mut service_directory.service_operator_status, service, table::new<address, u64>(ctx));
        };
        let mut operator_status = table::borrow_mut(&mut service_directory.service_operator_status, service);
        if (!table::contains(operator_status, operator)) {
            table::add(operator_status, operator, OPERATOR_Service_REG_UNREGISTERED);
        };

        let status = table::borrow(operator_status, operator);
        assert!(status != OPERATOR_Service_REG_UNREGISTERED, E_OPERATOR_NOT_REGISTERED_TO_Service);
        
        table::add(operator_status, operator, OPERATOR_Service_REG_UNREGISTERED);        
        
        event::emit(OperatorServiceRegistrationStatusUpdated {
            operator,
            service,
            status: OPERATOR_Service_REG_UNREGISTERED,
        });
    }

    public fun is_operator_registered(
        service_directory: &ServiceDirectory,
        service: address,
        operator: address
    ): bool {
        if (!table::contains(&service_directory.service_operator_status, service)) {
            return false;
        };
        let operator_status = table::borrow(&service_directory.service_operator_status, service);
        if (!table::contains(operator_status, operator)) {
            return false;
        };
        let status = table::borrow(operator_status, operator);
        status == OPERATOR_Service_REG_REGISTERED
    }

    #[test_only]
    public(package) fun init_for_testing(
        ctx: &mut TxContext
    ) {
        init(ctx);
    }
}