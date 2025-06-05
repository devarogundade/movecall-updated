// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { zeroAddress } from "viem";
import TokenModule from "./Token";

const MoveCall =
  "0x8c4bcfe5cac89ea732d9f507f46d56a7e37e3d161007060a5686b9399a9ea03c";

const NebulaModule = buildModule("NebulaModule", (m) => {
  const movecall_bridge = m.contract("MoveCallBridge");
  const { iota, lbtc } = m.useModule(TokenModule);

  m.call(
    movecall_bridge,
    "setCoinType",
    [zeroAddress, `${MoveCall}::eth::ETH`],
    {
      id: "ETH",
    }
  );
  m.call(movecall_bridge, "setCoinType", [iota, `${MoveCall}::iota::IOTA`], {
    id: "IOTA",
  });
  m.call(movecall_bridge, "setCoinType", [lbtc, `${MoveCall}::lbtc::LBTC`], {
    id: "LBTC",
  });

  m.call(
    movecall_bridge,
    "setCoinType",
    [zeroAddress, `${MoveCall}::eth::ETH`],
    {
      id: "ETH2",
    }
  );
  m.call(movecall_bridge, "setCoinType", [iota, `${MoveCall}::iota::IOTA`], {
    id: "IOTA2",
  });
  m.call(movecall_bridge, "setCoinType", [lbtc, `${MoveCall}::lbtc::LBTC`], {
    id: "LBTC2",
  });

  m.call(
    movecall_bridge,
    "setCoinType",
    [
      iota,
      `0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA`,
    ],
    {
      id: "IOTA22",
    }
  );

  return { movecall_bridge };
});

export default NebulaModule;
