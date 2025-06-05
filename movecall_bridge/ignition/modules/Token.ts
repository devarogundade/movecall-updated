// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "viem";

const TokenModule = buildModule("TokenModule", (m) => {
  const iota = m.contract("Token", ["IOTA", "IOTA", 9], { id: "Token_IOTA" });
  const doge = m.contract("Token", ["DogeCoin", "DOGE", 18], {
    id: "Token_DOGE",
  });

  m.call(iota, "mint", [parseUnits("1", 9)], { id: "IOTA" });
  m.call(doge, "mint", [parseUnits("150000", 18)], { id: "DOGE" });

  return { iota, doge };
});

export default TokenModule;
