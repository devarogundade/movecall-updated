import { Contract } from "./contract";
import type { Coin, Service, Operator } from "./types";

export const IOTA_COIN =
  "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA";

const findStrategy = (coinType: string): Coin | undefined => {
  return strategies.find((strategy) => strategy.type == coinType);
};

const strategies: Coin[] = [
  {
    name: "IOTA",
    symbol: "IOTA",
    decimals: 9,
    image: "/images/iota.png",
    type: IOTA_COIN,
    about:
      "IOTA is a decentralized blockchain infrastructure to build and secure our digital world.",
    link: "https://iota.org",
  },

  {
    name: "ANKR Staked IOTA",
    symbol: "ankrIOTA",
    decimals: 9,
    image: "/images/ankr.png",
    type: `${Contract.MoveCall}::ankriota::ANKRIOTA`,
    about: "The fastest, most reliable connection to Web3.",
    link: "https://ankr.com",
    isLst: true,
    faucet: {
      amount: 5,
      module: "ankriota",
      object:
        "0x92fb2c5f96742e08341310e945e1255eada96401cb6bebade89699a66d5025e1",
    },
  },
];

const operators: Operator[] = [
  {
    name: "FontLabs",
    image: "/images/colors.png",
    about:
      "FontLabs. The drive to unlock everything that web3 enables is our north star.",
    active: true,
    address:
      "0x9e1b49043efc0bead9d0381713fa0c4348b05f59450cbb90961b6b98a67adb23",
    link: "https://mystenlabs.com",
  },
  {
    name: "ShunLexxi",
    image: "/images/colors.png",
    about:
      "Shunlexxi is a protocol that allows market participants to publish pricing information on-chain for others to use.",
    active: true,
    address:
      "0x43988c5c280487483d05c4d5e1aba8d206f82c4c5d8493e85205f9ac393bcc61",
    link: "https://shunlexxi.network",
  },
  {
    name: "ANKR",
    image: "/images/ankr.png",
    about: "ANKR.",
    active: true,
    address:
      "0x237fab2f9f5afc3eacec176fe1721534032cf85590f0e5a36dc6d7c668dbf897",
    link: "https://ankr.com",
  },
];

const services: Service[] = [
  {
    name: "MoveCallBridge",
    address:
      "0x15ebec4c1f58e38024783d351f69ccdcebf02561e5d85aaf9ac40145770a0fc4",
    description:
      "MoveCallBridge is a decentralized bridge that allows users to transfer assets and messages between different blockchains using zero-knowledge proofs.",
    link: "https://movecall-bridge.netlify.app",
    image: "/images/colors.png",
    reward_coin: {
      name: "IOTA",
      symbol: "IOTA",
      decimals: 9,
      image: "/images/iota.png",
      type: IOTA_COIN,
      about: "IOTA Coin.",
      link: "https://iota.org",
    },
    weekly_rewards: 16402000,
  },
];

const findOperator = (address: string): Operator | undefined => {
  return operators.find((operator) => operator.address == address);
};

const findService = (address: string): Service | undefined => {
  return services.find((service) => service.address == address);
};

export {
  strategies,
  findStrategy,
  operators,
  findOperator,
  services,
  findService,
};
