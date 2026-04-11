import type { OffkaiEventSummary, Unbrand } from "@offkai/core";
import { onMounted, ref } from "vue";
import { useApi } from "@/common/composables";

export type { OffkaiEventSummary };

export function useMyOffkaiEvents() {
  const events = ref<Unbrand<OffkaiEventSummary>[]>([]);
  const { get, loading, error } = useApi();

  onMounted(async () => {
    const data = await get<Unbrand<OffkaiEventSummary>[]>("/offkai-event/my");
    if (data) {
      events.value = data;
    }
  });

  return { events, loading, error };
}
