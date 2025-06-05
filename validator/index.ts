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
  "0x8c4bcfe5cac89ea732d9f507f46d56a7e37e3d161007060a5686b9399a9ea03c";
const Service_DIRECTORY: Hex =
  "0x972411f5178b5de7b7616f1a65bdf5ada2c89f62693cbc6b7d2df165669aec37";
const Service_MANAGER: Hex =
  "0xafcde1ad80463f96bb2163935b1669e6d68479b12973ea4286f56295c58a9233";
const DELEGATION_MANAGER: Hex =
  "0x5ce45c986b9b830939998114531c30a84a9da636912e5d9af596614d41364316";

const HOLESKY_NEBULA: Hex = "0x5629A11542f5582A466d281f3Ce8Aa5309f42837";

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
      address: HOLESKY_NEBULA,
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
