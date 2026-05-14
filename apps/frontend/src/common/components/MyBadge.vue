<template>
  <div class="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-5 py-2">
    <FontAwesomeIcon v-if="icon" :icon="icon" class="text-teal-500" />
    <span class="text-base font-semibold text-teal-700">
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
  import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

  defineProps<{
    icon?: IconDefinition;
  }>();
</script>
