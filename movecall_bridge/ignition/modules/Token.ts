// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "viem";

const TokenModule = buildModule("TokenModule", (m) => {
  const iota = m.contract("Token", ["IOTA", "IOTA", 9], { id: "Token_IOTA" });
  const lbtc = m.contract("Token", ["Liquid Bitcoin", "LBTC", 8], {
    id: "Token_LBTC",
  });

  m.call(iota, "mint", [parseUnits("1", 9)], { id: "IOTA" });
  m.call(lbtc, "mint", [parseUnits("0.5", 8)], { id: "LBTC" });

  return { iota, lbtc };
});

export default TokenModule;
