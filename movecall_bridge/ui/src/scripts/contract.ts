import { config } from "./config";
import { waitForTransactionReceipt, writeContract } from "@wagmi/core";
import type { Hex } from "viem";
import { movecallBridgeAbi } from "../abis/movecall_bridge";

const Contract = {
  address: "0xB4a0d0cf821F3EC41d8dd1d362eba14606ea4E0b" as Hex,

  async lockAndMint(
    token: Hex,
    amount: bigint,
    receiver: Hex
  ): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: movecallBridgeAbi,
        address: this.address,
        functionName: "lockAndMint",
        args: [token, amount, receiver],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },

  async lockAndMintETH(amount: bigint, receiver: Hex): Promise<Hex | null> {
    try {
      const result = await writeContract(config, {
        abi: movecallBridgeAbi,
        address: this.address,
        functionName: "lockAndMintETH",
        args: [receiver],
        value: amount,
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: result,
      });

      return receipt.transactionHash;
    } catch (error) {
      return null;
    }
  },
};

export { Contract };
