import { Transaction } from "@iota/iota-sdk/transactions";
import { client, Coins, Contract, Eth_Coin, Doge_Coin, signer } from "./shared";
import { bcs } from "@iota/iota-sdk/bcs";

async function setMinWeight() {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${Contract.MoveCall}::movecall_bridge::set_required_operator_weight`,
    arguments: [
      transaction.object(Contract.ServiceManager),
      transaction.object(Contract.MoveCallBridgeCap),
      transaction.pure.u64(1_000),
    ],
  });
  transaction.setGasBudget(50_000_000);
  const { digest } = await client.signAndExecuteTransaction({
    transaction,
    signer,
  });
  console.log("Transaction digest:", digest);
}

async function setQuorum() {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${Contract.MoveCall}::movecall_bridge::set_quorum`,
    arguments: [
      transaction.object(Contract.ServiceManager),
      transaction.object(Contract.MoveCallBridgeCap),
      transaction.pure(
        bcs
          .vector(bcs.String)
          .serialize([
            "0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
            ...Coins.map((coin) =>
              `${Contract.MoveCall}::${coin.module}::${coin.coinType}`.replace(
                "0x",
                ""
              )
            ),
          ])
      ),
      transaction.pure(bcs.vector(bcs.U64).serialize([6_000, 4_000])),
    ],
  });

  transaction.setGasBudget(50_000_000);
  const { digest } = await client.signAndExecuteTransaction({
    transaction,
    signer,
  });
  console.log("Transaction digest:", digest);
}

async function mintCoins(
  amount: number,
  faucet: string,
  module: string,
  coinType: string
) {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${Contract.MoveCall}::${module}::mint`,
    arguments: [
      transaction.object(faucet),
      transaction.pure.u64(amount),
      transaction.pure.address(signer.getPublicKey().toIotaAddress()),
    ],
    typeArguments: [`${Contract.MoveCall}::${module}::${coinType}`],
  });
  transaction.setGasBudget(5_000_000);
  const { digest } = await client.signAndExecuteTransaction({
    transaction,
    signer,
  });
  client.waitForTransaction({ digest });
  await new Promise((rv) => setTimeout(() => rv(null), 2_000));
  console.log("Transaction digest:", digest);
}

async function depositCoins(
  coin_deposited: string,
  module: string,
  coinType: string
) {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${Contract.MoveCall}::movecall_bridge::deposit`,
    arguments: [
      transaction.object(Contract.MoveCallBridge),
      transaction.object(Contract.MoveCallBridgeCap),
      transaction.object(coin_deposited),
    ],
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
  await setQuorum();
  await setMinWeight();

  // Deposit ETH
  const eth_amount = 1_000_000 * 10 ** 9;
  await mintCoins(
    eth_amount,
    Eth_Coin.faucet,
    Eth_Coin.module,
    Eth_Coin.coinType
  );
  const eth_coin_deposited = await client.getCoins({
    coinType: `${Contract.MoveCall}::${Eth_Coin.module}::${Eth_Coin.coinType}`,
    owner: signer.getPublicKey().toIotaAddress(),
  });

  await depositCoins(
    eth_coin_deposited.data[0].coinObjectId,
    Eth_Coin.module,
    Eth_Coin.coinType
  );

  // Deposit DOGE
  const doge_amount = 10_000 * 10 ** 9;
  await mintCoins(
    doge_amount,
    Doge_Coin.faucet,
    Doge_Coin.module,
    Doge_Coin.coinType
  );
  const doge_coin_deposited = await client.getCoins({
    coinType: `${Contract.MoveCall}::${Doge_Coin.module}::${Doge_Coin.coinType}`,
    owner: signer.getPublicKey().toIotaAddress(),
  });
  await depositCoins(
    doge_coin_deposited.data[0].coinObjectId,
    Doge_Coin.module,
    Doge_Coin.coinType
  );
}

main();
