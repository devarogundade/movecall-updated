import { NightlyConnectIotaAdapter } from "@nightlylabs/wallet-selector-iota";
import { ref } from "vue";

const adapter = ref<NightlyConnectIotaAdapter | null>(null);

export const useAdapter = () => {
  const initAdapter = async () => {
    adapter.value = await NightlyConnectIotaAdapter.build({
      appMetadata: {
        name: "MoveCall.",
        description: "MoveCall | IOTA Restaking.",
        icon: "https://avatars.githubusercontent.com/u/37784886",
        additionalInfo: "MoveCall",
      },
    });
  };

  return { adapter, initAdapter };
};
