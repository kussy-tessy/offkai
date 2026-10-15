<template>
  <span
    v-if="can('settlement', 'edit')"
    class="flex shrink-0 gap-1"
  >
    <MyButton
      title="編集"
      :aria-label="`${label}を編集`"
      class="!border-0 !p-1"
      :disabled="!editable"
      type="button"
      size="sm"
      variant="ghost"
      @click="emit('edit')"
    >
      <FontAwesomeIcon :icon="faPen" />
    </MyButton>
    <MyButton
      title="削除"
      :aria-label="`${label}を削除`"
      class="!border-0 !p-1"
      :disabled="!editable"
      type="button"
      size="sm"
      variant="ghost"
      color="red"
      @click="emit('remove')"
    >
      <FontAwesomeIcon :icon="faTrash" />
    </MyButton>
  </span>
</template>
<script setup lang="ts">
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import MyButton from "@/common/components/MyButton.vue";
import { useLedgerSession } from "../composables/useLedgerSession";
defineProps<{ label: string }>();
const emit = defineEmits<{ edit: []; remove: [] }>();
const { editable, can } = useLedgerSession();
</script>
