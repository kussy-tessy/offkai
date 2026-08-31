import type { OffkaiDetail, StaffPermissions, Unbrand } from "@offkai/core";
import { ref } from "vue";
import { useApi } from "@/common/composables";

export function useEventStaffAccess(eventId: string) {
  const { get } = useApi();
  const isOwner = ref(false);
  const permissions = ref<StaffPermissions | null>(null);
  const loadAccess = async () => {
    const detail = await get<Unbrand<OffkaiDetail>>(`/offkai-event/${eventId}/detail`);
    isOwner.value = detail?.viewer.seriesRole === "owner";
    permissions.value = detail?.viewer.staffPermissions ?? null;
  };
  return { isOwner, permissions, loadAccess };
}
