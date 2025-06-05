import dotenv from "dotenv";

import axios from "axios";
import { IOTA_CLOCK_OBJECT_ID } from "@iota/iota-sdk/utils";
import { createPublicClient, defineChain, http, parseAbiItem } from "viem";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
import { Transaction } from "@iota/iota-sdk/transactions";
import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";

import type { Hex, WatchEventReturnType } from "viem";

dotenv.config();

const MoveCall: Hex =
  "0x15ebec4c1f58e38024783d351f69ccdcebf02561e5d85aaf9ac40145770a0fc4";
const Service_DIRECTORY: Hex =
  "0x153f162474f7b5c13fbb8f2b356de6122b33ba4d061301d451aa02c32e704029";
const Service_MANAGER: Hex =
  "0xbb3d1da683ec7bdd40b8e30fdadbca7e8a6d70295fb74d1419af13799bf90c20";
const DELEGATION_MANAGER: Hex =
  "0x58db2a42669b7bb98231ddf63fa8f23160d706ccd656a8f741f64fc3f662e222";

const HOLESKY_MOVECALL_BRIDGE: Hex =
  "0x5629A11542f5582A466d281f3Ce8Aa5309f42837";

const API = axios.create({ baseURL: process.env.MAIN_URL });

type TokenLockedEvent = {
  uid: Hex;
  coinType: string;
  decimals: number;
  amount: string;
  receiver: Hex;
  block_number: string;
  chain_id: number;
};

type MessageSentEvent = {
  uid: Hex;
};

interface EventListenerCallback {
  onTokenLockedEvent: (events: TokenLockedEvent[]) => void;
  onMessageSentEvent: (events: MessageSentEvent[]) => void;
}

if (!process.env.SECRET_KEY) throw new Error("Invalid secret key!");

const signer = Ed25519Keypair.fromSecretKey(process.env.SECRET_KEY);

class EventSigner {
  async sign(event: TokenLockedEvent): Promise<
    | (TokenLockedEvent & {
        signature: number[];
        signer: string;
      })
    | null
  > {
    try {
      const signature = await signer.sign(new TextEncoder().encode(event.uid));

      return {
        ...event,
        signature: Array.from(signature),
        signer: signer.getPublicKey().toIotaAddress(),
      };
    } catch (error) {
      console.error("Error attesting event:", error);
      return null;
    }
  }
}

const eventSigner = new EventSigner();

const callback: EventListenerCallback = {
  onTokenLockedEvent(events: TokenLockedEvent[]) {
    events.forEach(async (event) => {
      const data = await eventSigner.sign(event);
      if (data) {
        API.post("/token-locked-event", JSON.stringify(data));
      }
    });
  },

  onMessageSentEvent(events: MessageSentEvent[]) {
    events.forEach(async (event) => {
      const data = await eventSigner.sign(event);
      if (data) {
        API.post("/message-sent-event", JSON.stringify(data));
      }
    });
  },
};

class EventListener {
  unwatch: WatchEventReturnType | undefined = undefined;

  async startListening(callback: EventListenerCallback) {
    const publicClient = createPublicClient({
      chain: defineChain({
        id: 17_000,
        name: "Holesky",
        nativeCurrency: { name: "Holesky Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: {
            http: ["https://rpc.ankr.com/eth_holesky"],
          },
        },
      }),
      transport: http(),
    });

    const fromBlock = await publicClient.getBlockNumber();

    console.log("Started listening from block: ", fromBlock);

    this.unwatch = publicClient.watchContractEvent({
      address: HOLESKY_MOVECALL_BRIDGE,
      fromBlock,
      abi: "" as any,
      pollingInterval: 15_000, // 15 Secs
      onLogs: (events) => {
        console.log(events);
      },
      onError: (error) => {
        console.log(error);
      },
    });
  }

  stopListening() {
    if (this.unwatch) this.unwatch();
  }
}

class Registrar {
  async registerToService() {
    try {
      const transaction = new Transaction();
      transaction.moveCall({
        target: `${MoveCall}::movecall_bridge::register_operator`,
        arguments: [
          transaction.object(Service_MANAGER),
          transaction.object(Service_DIRECTORY),
          transaction.object(DELEGATION_MANAGER),
          transaction.object(IOTA_CLOCK_OBJECT_ID),
        ],
      });

      transaction.setGasBudget(50_000_000);

      const client = new IotaClient({ url: getFullnodeUrl("testnet") });
      const { digest } = await client.signAndExecuteTransaction({
        signer,
        transaction,
      });
      console.log("Transaction digest:", digest);
    } catch (error) {}
  }
}

new EventListener().startListening(callback);
new Registrar().registerToService();
