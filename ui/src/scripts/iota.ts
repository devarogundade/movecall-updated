import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

const Clients = {
  iotaClient: new IotaClient({ url: getFullnodeUrl("testnet") }),
};

export { Clients };
