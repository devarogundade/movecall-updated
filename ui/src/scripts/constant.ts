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
      "0x680d67389bdf13450ef450ee7db1a373d660269caf4f31640ee3511989396159",
    link: "https://mystenlabs.com",
  },
  {
    name: "ShunLexxi",
    image: "/images/colors.png",
    about:
      "Shunlexxi is a protocol that allows market participants to publish pricing information on-chain for others to use.",
    active: true,
    address:
      "0xa3130600c44ef580a9509845f6cf95cac0128ccaecfed604ffc194ed3048b273",
    link: "https://shunlexxi.network",
  },
  {
    name: "ANKR",
    image: "/images/ankr.png",
    about: "ANKR.",
    active: false,
    address:
      "0xb5d26c810c65c91936c7eaad4393b73b89f21f461b39129b64917a3eea58e304",
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
    weekly_rewards: 18500,
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
