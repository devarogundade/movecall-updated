import dotenv from "dotenv";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
import { Ed25519Keypair } from "@iota/iota-sdk/cryptography";

dotenv.config();

const Contract = {
  MoveCall:
    "0x15ebec4c1f58e38024783d351f69ccdcebf02561e5d85aaf9ac40145770a0fc4",
  ServiceManager:
    "0xbb3d1da683ec7bdd40b8e30fdadbca7e8a6d70295fb74d1419af13799bf90c20",
  ServiceDirectory:
    "0x153f162474f7b5c13fbb8f2b356de6122b33ba4d061301d451aa02c32e704029",
  StrategyFactory:
    "0xde6b361ccbf387979426109692f3ccc609ab8a916b7226cf2f4c413be6a470d1",
  StrategyManager:
    "0x683514bc7bd63d4f62c937c45f5b2ee37411a0e0b0d455f9a7ed050cf9ea999e",
  RewardsCoordinator:
    "0xa477cea84b8d50ee6d4bfa74ff75cf57ad33966ec290b199854a71ece8871746",
  AllocationManager:
    "0x04faf8a30fd4ded13bdcc466138055df3acc6c49c8b2252d13ecdf410a3a1ca0",
  DelegationManager:
    "0x58db2a42669b7bb98231ddf63fa8f23160d706ccd656a8f741f64fc3f662e222",
  MoveCallBridge:
    "0x157dbc3e87ad585e82d189d203d7d44c86cbf55c914a8144d637af8cac2f9d79",
  MoveCallBridgeCap:
    "0x129c304845fdbf9d628bb8befb2355fea586f80b24cd6a4c4f4c5389b0c3f379",
};

const client = new IotaClient({
  url: getFullnodeUrl("testnet"),
});

const signer = Ed25519Keypair.deriveKeypair(process.env.SECRET_KEY!);

const Coins = [
  {
    module: "ankriota",
    coinType: "ANKRIOTA",
    treasuryCap:
      "0x0b3c7d8de873b125f9db0ffbb1dd0048157a3c645dc321a6b806f63cea1e54ea",
    faucet:
      "0x92fb2c5f96742e08341310e945e1255eada96401cb6bebade89699a66d5025e1",
  },
];

const Eth_Coin = {
  module: "eth",
  coinType: "ETH",
  treasuryCap:
    "0xebc6699e13027ce7a239c3be8805b2da851cb076e276e1185cf54bc4f7f5ad5f",
  faucet: "0xf5096f3703b038598324b047995a0ecf5f10bc48fc5e9843a48e96e17f511813",
};

const Doge_Coin = {
  module: "doge",
  coinType: "DOGE",
  treasuryCap:
    "0xf0ff205ba78f65c6ae9004862fce7e10de12ad7c4ea745ba72d5b0a2991012c1",
  faucet: "0x374b6c4b30531542006aa3d2bff6c99ceffc5a22c26af458816f8078b57b5b7f",
};

const Operators = [
  {
    key: process.env.SECRET_KEY_FONTLABS,
    metdata_uri: JSON.stringify({
      name: "FontLabs",
      about: "FontLabs.",
      website: "https://fontlabs.com",
      image: "https://fontlabs.com",
    }),
  },
  {
    key: process.env.SECRET_KEY_SHUNLEXXI,
    metdata_uri: JSON.stringify({
      name: "ShunLexxi",
      about:
        "ShunLexxi is a protocol that allows market participants to publish pricing information on-chain for others to use.",
      website: "https://shunlexxi.network",
      image: "https://shunlexxi.network",
    }),
  },
  {
    key: process.env.SECRET_KEY_ANKR,
    metdata_uri: JSON.stringify({
      name: "ANKR",
      about: "ANKR.",
      website: "https://ankr.com",
      image: "https://ankr.com",
    }),
  },
];

export { Contract, client, signer, Coins, Operators, Eth_Coin, Doge_Coin };
