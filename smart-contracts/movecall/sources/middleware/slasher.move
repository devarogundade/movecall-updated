// SPDX-License-Identifier: MIT
module movecall::slasher_module {
    use iota::tx_context::TxContext;

    use movecall::strategy_factory_module::{Self, StrategyFactory};
    use movecall::strategy_manager_module::{StrategyManager};
    use movecall::allocation_module::{Self, AllocationManager, SlashingParams};
    use movecall::delegation_module::{Self, DelegationManager};

    public fun slash<CoinType>(
        strategy_factory: &mut StrategyFactory,
        strategy_manager: &mut StrategyManager,
        allocation_manager: &mut AllocationManager,
        delegation_manager: &mut DelegationManager,
        service: address,
        params: SlashingParams,
        ctx: &mut TxContext
    ) {
        let (prev_max_magnitude, max_magnitude) = allocation_module::slash_operator_shares(
            strategy_manager,
            allocation_manager,
            service,
            params,
            ctx
        );

        let (operator, _) = allocation_module::params_to_operator_and_strategy_id(params);
        let mut strategy = strategy_factory_module::get_strategy_mut<CoinType>(strategy_factory);

        delegation_module::slash_operator_shares<CoinType>(
            strategy,
            strategy_manager,
            delegation_manager,
            operator,
            prev_max_magnitude,
            max_magnitude,
            ctx
        );
    }
}