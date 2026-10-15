<template>
  <label class="flex gap-2 items-center rounded bg-teal-50 p-3"
    ><input
      v-model="fields.payNow"
      type="checkbox"
      class="!w-auto"
    />{{
      outgoing
        ? "この金額を支払済みとして同時に記録する"
        : "この金額を受領済みとして同時に記録する"
    }}</label
  >
  <div
    v-if="fields.payNow"
    class="space-y-2"
  >
    <label
      >受け渡し日時<input
        v-model="fields.localAt"
        type="datetime-local"
        required
    /></label>
  </div>
</template>
<script setup lang="ts">
import type { PaymentRecordFields } from "./payment-record-fields";

defineProps<{ outgoing?: boolean }>();
const fields = defineModel<PaymentRecordFields>({ required: true });
</script>
<style scoped src="../styles/ledger-form.css"></style>
