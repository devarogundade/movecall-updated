import { Transaction } from "@iota/iota-sdk/transactions";
import { Contract, client, Operators } from "./shared";
import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";

async function registerAsOperator(key: string, metdata_uri: string) {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${Contract.MoveCall}::delegation_module::register_as_operator`,
    arguments: [
      transaction.object(Contract.StrategyManager),
      transaction.object(Contract.AllocationManager),
      transaction.object(Contract.DelegationManager),
      transaction.pure.string(metdata_uri),
    ],
  });
  transaction.setGasBudget(50_000_000);
  const signer = Ed25519Keypair.deriveKeypair(key);
  const { digest } = await client.signAndExecuteTransaction({
    transaction,
    signer,
  });
  console.log("Transaction digest:", digest);
}

async function main() {
  for (const operator of Operators) {
    await registerAsOperator(operator.key!, operator.metdata_uri);
  }
}

main();
