import { Transaction } from "@iota/iota-sdk/transactions";
import { Contract, client, Coins, signer, Eth_Coin, Doge_Coin } from "./shared";

async function initSupply(
  module: string,
  coinType: string,
  treasuryCap: string,
  faucet: string
) {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${Contract.MoveCall}::${module}::init_supply`,
    arguments: [transaction.object(treasuryCap), transaction.object(faucet)],
    typeArguments: [`${Contract.MoveCall}::${module}::${coinType}`],
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
    await initSupply(coin.module, coin.coinType, coin.treasuryCap, coin.faucet);
  }
  await initSupply(
    Eth_Coin.module,
    Eth_Coin.coinType,
    Eth_Coin.treasuryCap,
    Eth_Coin.faucet
  );
  await initSupply(
    Doge_Coin.module,
    Doge_Coin.coinType,
    Doge_Coin.treasuryCap,
    Doge_Coin.faucet
  );
}

main();
