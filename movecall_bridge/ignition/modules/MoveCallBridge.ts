// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { zeroAddress } from "viem";
import TokenModule from "./Token";

const MoveCall =
  "0x15ebec4c1f58e38024783d351f69ccdcebf02561e5d85aaf9ac40145770a0fc4";

const NebulaModule = buildModule("NebulaModule", (m) => {
  const movecall_bridge = m.contract("MoveCallBridge");
  const { iota, doge } = m.useModule(TokenModule);

  m.call(
    movecall_bridge,
    "setCoinType",
    [
      iota,
      `0000000000000000000000000000000000000000000000000000000000002::iota::IOTA`,
    ],
    {
      id: "IOTA",
    }
  );

  m.call(
    movecall_bridge,
    "setCoinType",
    [zeroAddress, `${MoveCall}::eth::ETH`],
    {
      id: "ETH",
    }
  );

  m.call(movecall_bridge, "setCoinType", [doge, `${MoveCall}::doge::DOGE`], {
    id: "DOGE",
  });

  return { movecall_bridge };
});

export default NebulaModule;
