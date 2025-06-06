import { CoinAPI } from "@/scripts/coin";
import { operators, strategies } from "@/scripts/constant";
import { Contract } from "@/scripts/contract";
import { Clients } from "@/scripts/iota";
import { bcs } from "@iota/iota-sdk/bcs";
import { defineStore } from "pinia";

const IOTA_FRAMEWORK_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000002";

export const useBalanceStore = defineStore("balance", {
  state: () => ({
    // restake
    total_balance: BigInt(0),
    balances: {} as { [key: string]: bigint },
    value_restaked: {} as { [key: string]: bigint },
    total_value_restaked: {} as { [key: string]: bigint },

    // operator
    your_shares: {} as { [key: string]: bigint },
    total_shares: {} as { [key: string]: bigint },

    // service
    iota_restaked: {} as { [key: string]: bigint },
    total_num_operators: {} as { [key: string]: number },
    total_num_stakers: {} as { [key: string]: number },
  }),
  actions: {
    getBalances(owner: string | null) {
      if (owner) {
        this.getCoinBalances(owner);
        this.getValueRestaked(owner);
      }
      this.getTotalValueRestaked();
    },

    getOperatorBalances() {
      this.getOperatorShares();
      this.getServiceSecured();
    },

    getServiceBalance() {
      this.getTotalServiceValueRestaked();
      this.getTotalNumOperators();
      this.getTotalNumStakers();
    },

    async getCoinBalances(owner: string) {
      this.balances = await CoinAPI.getCoinsBalance(
        owner,
        strategies.map((strategy) => strategy.type)
      );
    },

    async getValueRestaked(owner: string) {
      const transaction = Contract.getAllStakerShares(
        strategies.map((strategy) => strategy.type.replace("0x", "")),
        owner
      );

      const { results } = await Clients.iotaClient.devInspectTransactionBlock({
        transactionBlock: transaction,
        sender: owner,
      });
      if (!results) return;
      if (!results[0].returnValues) return;

      const value_restaked = bcs
        .vector(bcs.U64)
        .parse(Uint8Array.from(results[0].returnValues[0][0]));

      this.total_balance = BigInt(0);
      strategies.forEach((strategy, index) => {
        this.value_restaked[strategy.type] = BigInt(value_restaked[index]);
        this.total_balance += BigInt(value_restaked[index]);
      });
    },

    async getTotalValueRestaked() {
      const transaction = Contract.getAllTotalShares(
        strategies.map((strategy) => strategy.type.replace("0x", ""))
      );

      const { results } = await Clients.iotaClient.devInspectTransactionBlock({
        transactionBlock: transaction,
        sender: IOTA_FRAMEWORK_ADDRESS,
      });
      if (!results) return;
      if (!results[0].returnValues) return;

      const total_value_restaked = bcs
        .vector(bcs.U64)
        .parse(Uint8Array.from(results[0].returnValues[0][0]));

      strategies.forEach((strategy, index) => {
        this.total_value_restaked[strategy.type] = BigInt(
          total_value_restaked[index]
        );
      });
    },

    async getOperatorShares() {
      for (let index = 0; index < operators.length; index++) {
        const operator = operators[index].address;

        const transaction = Contract.getOperatorShares(
          strategies.map((strategy) => strategy.type.replace("0x", "")),
          operator
        );

        const { results } = await Clients.iotaClient.devInspectTransactionBlock(
          {
            transactionBlock: transaction,
            sender: IOTA_FRAMEWORK_ADDRESS,
          }
        );
        if (!results) return;
        if (!results[0].returnValues) return;

        const total_shares = bcs
          .vector(bcs.U64)
          .parse(Uint8Array.from(results[0].returnValues[0][0]));

        this.total_shares[operator] = total_shares.reduce(
          (a, b) => a + BigInt(b),
          BigInt(0)
        );
      }
    },

    async getServiceSecured() {},

    async getTotalServiceValueRestaked() {},

    async getTotalNumOperators() {},

    async getTotalNumStakers() {},
  },
});
