import { Transaction } from "@iota/iota-sdk/transactions";
import { Contract, client, Coins, signer } from "./shared";

async function deployStrategy(coinType: string) {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${Contract.MoveCall}::strategy_factory_module::deploy_new_strategy`,
    arguments: [transaction.object(Contract.StrategyFactory)],
    typeArguments: [coinType],
  });
  transaction.setGasBudget(5_000_000);
  const { digest } = await client.signAndExecuteTransaction({
    transaction,
    signer,
  });
  console.log("Transaction digest:", digest);
}

async function main() {
  for (const coin of Coins) {
    await deployStrategy(
      `${Contract.MoveCall}::${coin.module}::${coin.coinType}`
    );
  }
}

main();
