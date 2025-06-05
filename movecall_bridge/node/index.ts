import dotenv from "dotenv";

import { IOTA_CLOCK_OBJECT_ID, IOTA_TYPE_ARG } from "@iota/iota-sdk/utils";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
import { Transaction } from "@iota/iota-sdk/transactions";
import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";
import { bcs } from "@iota/iota-sdk/bcs";
import http from "http";

import type { Hex } from "viem";

type TokenLockedEvent = {
  uid: Hex;
  coinType: string;
  decimals: number;
  amount: string;
  receiver: Hex;
  block_number: string;
  chain_id: number;
  signature: number[];
  signer: string;
};

type MessageSentEvent = {
  uid: Hex;
  from: Hex;
  to: Hex;
  payload: Hex;
  block_number: string;
  chain_id: number;
  signature: number[];
  signer: string;
};

type SignedTokenLockedEvent = {
  uid: Hex;
  coinType: string;
  decimals: number;
  amount: string;
  receiver: Hex;
  block_number: string;
  chain_id: number;
  signatures: number[][];
  signers: string[];
};

type SignedMessageSentEvent = {
  uid: Hex;
  from: Hex;
  to: Hex;
  payload: Hex;
  block_number: string;
  chain_id: number;
  signatures: number[][];
  signers: string[];
};

dotenv.config();

const MinAttestation = 2;
const TokenMemPool: Record<string, TokenLockedEvent[]> = {};
const MessageMemPool: Record<string, MessageSentEvent[]> = {};
const ProcessingPool: Record<string, boolean> = {};

const MOVECALL: Hex =
  "0x15ebec4c1f58e38024783d351f69ccdcebf02561e5d85aaf9ac40145770a0fc4";
const MOVECALL_BRIDGE: Hex =
  "0x157dbc3e87ad585e82d189d203d7d44c86cbf55c914a8144d637af8cac2f9d79";
const SERVICE_DIRECTORY: Hex =
  "0x153f162474f7b5c13fbb8f2b356de6122b33ba4d061301d451aa02c32e704029";
const SERVICE_MANAGER: Hex =
  "0xbb3d1da683ec7bdd40b8e30fdadbca7e8a6d70295fb74d1419af13799bf90c20";
const DELEGATION_MANAGER: Hex =
  "0x58db2a42669b7bb98231ddf63fa8f23160d706ccd656a8f741f64fc3f662e222";

const COIN_METADATA: Record<string, Hex> = {};

const ETH_TYPE_ARG = `${MOVECALL}::eth::ETH`;
const DOGE_TYPE_ARG = `${MOVECALL}::doge::DOGE`;

COIN_METADATA[IOTA_TYPE_ARG] =
  "0x587c29de216efd4219573e08a1f6964d4fa7cb714518c2c8a0f29abfa264327d";
COIN_METADATA[ETH_TYPE_ARG] =
  "0x889649cd0417e8e321c9cbfa87b3fb0bacbbaa6ff8974791dfca663facdbf5e6";
COIN_METADATA[DOGE_TYPE_ARG] =
  "0x2dfbea97cd9f9ae769b95abc1d07a94d690350d158706b3c320935fb63d25dc3";

const client = new IotaClient({ url: getFullnodeUrl("testnet") });

interface SubmitCallback {
  onSubmitForToken: (event: TokenLockedEvent) => void;
  onSubmitForMessage: (event: MessageSentEvent) => void;
}

class Attester {
  getSignedEvent(events: TokenLockedEvent[]): SignedTokenLockedEvent | null {
    if (!events.every((event) => event.uid == events[0].uid)) return null;
    if (!events.every((event) => event.coinType == events[0].coinType))
      return null;
    if (!events.every((event) => event.decimals == events[0].decimals))
      return null;
    if (!events.every((event) => event.amount == events[0].amount)) return null;
    if (!events.every((event) => event.receiver == events[0].receiver))
      return null;
    if (!events.every((event) => event.block_number == events[0].block_number))
      return null;
    if (!events.every((event) => event.chain_id == events[0].chain_id))
      return null;
    return {
      ...events[0],
      signatures: events.map((event) => event.signature),
      signers: events.map((event) => event.signer),
    };
  }

  async attest(events: TokenLockedEvent[]): Promise<boolean> {
    if (!process.env.SECRET_KEY) throw new Error("Invalid secret key!");

    const event = this.getSignedEvent(events);
    console.log("Last event:", event);

    if (!event) return false;

    if (ProcessingPool[event.uid]) return false;

    try {
      console.log("Processing");
      ProcessingPool[event.uid] = true;

      const tx = new Transaction();

      tx.moveCall({
        target: `${MOVECALL}::movecall_bridge::attest`,
        arguments: [
          tx.object(MOVECALL_BRIDGE),
          tx.object(COIN_METADATA[event.coinType]),
          tx.object(SERVICE_MANAGER),
          tx.object(SERVICE_DIRECTORY),
          tx.object(DELEGATION_MANAGER),
          bcs
            .vector(bcs.vector(bcs.U8))
            .serialize(event.signatures.map((signature) => signature)),
          bcs.vector(bcs.Address).serialize(event.signers),
          bcs.vector(bcs.U8).serialize(new TextEncoder().encode(event.uid)),
          tx.pure.u64(event.chain_id),
          tx.pure.u64(event.block_number),
          tx.pure.u64(event.amount),
          tx.pure.u8(event.decimals),
          tx.pure.address(event.receiver),
          tx.object(IOTA_CLOCK_OBJECT_ID),
        ],
        typeArguments: [event.coinType],
      });
      tx.setGasBudget(50_000_000);

      const signer = Ed25519Keypair.deriveKeypair(process.env.SECRET_KEY);
      const { digest } = await client.signAndExecuteTransaction({
        signer,
        transaction: tx,
      });

      console.log("Transaction Digest:", digest);

      delete TokenMemPool[event.uid];
      delete ProcessingPool[event.uid];

      return true;
    } catch (error) {
      console.error("Error attesting event:", error);
      delete ProcessingPool[event.uid];
      return false;
    }
  }
}

const attester = new Attester();

const callback: SubmitCallback = {
  onSubmitForToken(event: TokenLockedEvent) {
    if (!TokenMemPool[event.uid]) TokenMemPool[event.uid] = [];

    TokenMemPool[event.uid].push(event);

    if (TokenMemPool[event.uid].length >= MinAttestation) {
      attester.attest(TokenMemPool[event.uid]);
    }
  },

  onSubmitForMessage(event: MessageSentEvent) {
    if (!MessageMemPool[event.uid]) MessageMemPool[event.uid] = [];

    MessageMemPool[event.uid].push(event);

    if (MessageMemPool[event.uid].length >= MinAttestation) {
      // attester.writeMessage(MessageMemPool[event.uid]);
    }
  },
};

class Server {
  start() {
    const server = http.createServer((req, res) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString(); // Convert Buffer to string
      });

      const data = JSON.parse(body); // assuming it's JSON
      console.log("Received POST data:", data);

      req.on("end", () => {
        if (req.url === "/token-locked-event" && req.method === "POST") {
          callback.onSubmitForToken(data);
        } else if (req.url === "/message-sent-event" && req.method === "POST") {
          callback.onSubmitForMessage(data);
        }

        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(JSON.stringify({ message: "Received", data }));
      });
    });

    server.listen(process.env.PORT);
  }
}

const server = new Server();
server.start();
