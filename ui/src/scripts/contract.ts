import type { Coin } from "./types";
import { CoinAPI } from "./coin";
import { Transaction } from "@iota/iota-sdk/transactions";
import { bcs } from "@iota/iota-sdk/bcs";
import { IOTA_CLOCK_OBJECT_ID } from "@iota/iota-sdk/utils";
import type { NightlyConnectIotaAdapter } from "@nightlylabs/wallet-selector-iota";
import { IOTA_COIN } from "./constant";

const Contract = {
  MoveCall:
    "0x15ebec4c1f58e38024783d351f69ccdcebf02561e5d85aaf9ac40145770a0fc4",
  ServiceDirectory:
    "0x153f162474f7b5c13fbb8f2b356de6122b33ba4d061301d451aa02c32e704029",
  StrategyFactory:
    "0xde6b361ccbf387979426109692f3ccc609ab8a916b7226cf2f4c413be6a470d1",
  StrategyManager:
    "0x683514bc7bd63d4f62c937c45f5b2ee37411a0e0b0d455f9a7ed050cf9ea999e",
  RewardsCoordinator:
    "0xa477cea84b8d50ee6d4bfa74ff75cf57ad33966ec290b199854a71ece8871746",
  AllocationManager:
    "0x04faf8a30fd4ded13bdcc466138055df3acc6c49c8b2252d13ecdf410a3a1ca0",
  DelegationManager:
    "0x58db2a42669b7bb98231ddf63fa8f23160d706ccd656a8f741f64fc3f662e222",

  async mintCoin(
    sender: string,
    strategy: Coin,
    amount: bigint,
    adapter?: NightlyConnectIotaAdapter
  ): Promise<string | null> {
    if (!adapter) return null;

    try {
      const accounts = await adapter.getAccounts();
      if (accounts.length === 0) return null;

      const tx = new Transaction();

      if (!strategy.faucet) return null;

      tx.moveCall({
        target: `${this.MoveCall}::${strategy.faucet.module}::mint`,
        arguments: [
          tx.object(strategy.faucet.object),
          tx.pure.u64(amount),
          tx.pure.address(sender),
        ],
        typeArguments: [strategy.type],
      });

      const { digest } = await adapter.signAndExecuteTransaction({
        transaction: tx,
        chain: "iota:testnet",
        account: accounts[0],
      });

      return digest;
    } catch (error) {
      console.log(error);

      return null;
    }
  },

  async depositIntoStrategy(
    sender: string,
    strategy: Coin,
    amount: bigint,
    adapter?: NightlyConnectIotaAdapter
  ): Promise<string | null> {
    if (!adapter) return null;

    try {
      const accounts = await adapter.getAccounts();
      if (accounts.length === 0) return null;

      const tx = new Transaction();

      let coinDesposited;
      if (strategy.type === IOTA_COIN) {
        const [coinResult] = tx.splitCoins(tx.gas, [amount]);
        coinDesposited = coinResult;
      } else {
        const coins = await CoinAPI.getCoins(sender, strategy.type);
        const coinsObject = coins.data.map((coin) => coin.coinObjectId);
        if (coinsObject.length === 0) return null;
        const destinationInCoin = coinsObject[0];
        if (coinsObject.length > 1) {
          const [, ...otherInCoins] = coinsObject;
          tx.mergeCoins(destinationInCoin, otherInCoins);
        }
        const [coinResult] = tx.splitCoins(destinationInCoin, [
          tx.pure.u64(amount),
        ]);
        coinDesposited = coinResult;
      }

      tx.moveCall({
        target: `${this.MoveCall}::delegation_module::deposit_into_strategy`,
        arguments: [
          tx.object(this.StrategyFactory),
          tx.object(this.StrategyManager),
          tx.object(this.AllocationManager),
          tx.object(this.DelegationManager),
          tx.object(coinDesposited),
        ],
        typeArguments: [strategy.type],
      });

      const { digest } = await adapter.signAndExecuteTransaction({
        transaction: tx,
        chain: "iota:testnet",
        account: accounts[0],
      });

      return digest;
    } catch (error) {
      return null;
    }
  },

  async delegate(
    operator: string,
    adapter?: NightlyConnectIotaAdapter
  ): Promise<string | null> {
    if (!adapter) return null;

    try {
      const accounts = await adapter.getAccounts();
      if (accounts.length === 0) return null;

      const tx = new Transaction();

      tx.moveCall({
        target: `${this.MoveCall}::delegation_module::delegate`,
        arguments: [
          tx.object(this.StrategyManager),
          tx.object(this.AllocationManager),
          tx.object(this.DelegationManager),
          tx.pure.address(operator),
          tx.object(IOTA_CLOCK_OBJECT_ID),
        ],
      });

      const { digest } = await adapter.signAndExecuteTransaction({
        transaction: tx,
        chain: "iota:testnet",
        account: accounts[0],
      });

      return digest;
    } catch (error) {
      return null;
    }
  },

  async undelegate(
    staker: string,
    adapter?: NightlyConnectIotaAdapter
  ): Promise<string | null> {
    if (!adapter) return null;

    try {
      const accounts = await adapter.getAccounts();
      if (accounts.length === 0) return null;

      const tx = new Transaction();

      tx.moveCall({
        target: `${this.MoveCall}::delegation_module::undelegate`,
        arguments: [
          tx.object(this.StrategyManager),
          tx.object(this.AllocationManager),
          tx.object(this.DelegationManager),
          tx.pure.address(staker),
        ],
      });

      const { digest } = await adapter.signAndExecuteTransaction({
        transaction: tx,
        chain: "iota:testnet",
        account: accounts[0],
      });

      return digest;
    } catch (error) {
      return null;
    }
  },

  async redelegate(
    new_operator: string,
    adapter?: NightlyConnectIotaAdapter
  ): Promise<string | null> {
    if (!adapter) return null;

    try {
      const accounts = await adapter.getAccounts();
      if (accounts.length === 0) return null;

      const tx = new Transaction();

      tx.moveCall({
        target: `${this.MoveCall}::delegation_module::redelegate`,
        arguments: [
          tx.object(this.StrategyManager),
          tx.object(this.AllocationManager),
          tx.object(this.DelegationManager),
          tx.pure.address(new_operator),
          tx.object(IOTA_CLOCK_OBJECT_ID),
        ],
      });

      const { digest } = await adapter.signAndExecuteTransaction({
        transaction: tx,
        chain: "iota:testnet",
        account: accounts[0],
      });

      return digest;
    } catch (error) {
      return null;
    }
  },

  getAllTotalShares(strategyIds: string[]): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::strategy_manager_module::get_all_total_shares`,
      arguments: [
        tx.object(this.StrategyManager),
        tx.pure(bcs.vector(bcs.String).serialize(strategyIds)),
      ],
    });

    return tx;
  },

  getStakerShares(strategyId: string, staker: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::strategy_manager_module::get_staker_shares`,
      arguments: [
        tx.object(this.StrategyManager),
        tx.pure.string(strategyId),
        tx.pure.address(staker),
      ],
    });

    return tx;
  },

  getAllStakerShares(strategyIds: string[], staker: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::strategy_manager_module::get_all_staker_shares`,
      arguments: [
        tx.object(this.StrategyManager),
        tx.pure(bcs.vector(bcs.String).serialize(strategyIds)),
        tx.pure.address(staker),
      ],
    });

    return tx;
  },

  getDepositShares(staker: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::strategy_manager_module::deposit_shares`,
      arguments: [tx.object(this.StrategyManager), tx.pure.string(staker)],
    });

    return tx;
  },

  isDelegated(staker: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::delegation_module::is_delegated`,
      arguments: [tx.object(this.DelegationManager), tx.pure.address(staker)],
    });

    return tx;
  },

  isDelegatedTo(staker: string, operator: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::delegation_module::is_delegated_to`,
      arguments: [
        tx.object(this.DelegationManager),
        tx.pure.address(staker),
        tx.pure.address(operator),
      ],
    });

    return tx;
  },

  isOperator(account: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::delegation_module::is_operator`,
      arguments: [tx.object(this.DelegationManager), tx.pure.string(account)],
    });

    return tx;
  },

  getOperatorShares(strategyIds: string[], operator: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.MoveCall}::delegation_module::get_operator_shares`,
      arguments: [
        tx.object(this.DelegationManager),
        tx.pure.address(operator),
        tx.pure(bcs.vector(bcs.String).serialize(strategyIds)),
      ],
    });

    return tx;
  },
};

export { Contract };
