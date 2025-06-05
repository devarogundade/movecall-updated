import { zeroAddress } from "viem";
import type { Token } from "./types";

export const tokens: Token[] = [
  {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    price: 3_424.23,
    address: zeroAddress,
    image: "/images/eth.png",
    faucet: 0,
  },
  {
    name: "DogeCoin",
    symbol: "DOGE",
    decimals: 18,
    price: 0.00001,
    address: "0x254dCF60e384257414d0a1BF328389014Cd6a868",
    image: "/images/doge.png",
    faucet: 0.5,
  },
  {
    name: "IOTA",
    symbol: "IOTA",
    decimals: 9,
    price: 0.186,
    address: "0x800a2068cbB3323158Ec19A274d445c233d0207D",
    image: "/images/iota.png",
    faucet: 0.1,
  },
];
