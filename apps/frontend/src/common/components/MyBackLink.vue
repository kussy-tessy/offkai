<template>
  <RouterLink
    :to="to"
    class="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
  >
    <FontAwesomeIcon :icon="faArrowLeft" />
    <slot>戻る</slot>
  </RouterLink>
</template>

<script setup lang="ts">
  import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import type { RouteLocationRaw } from "vue-router";

  defineProps<{
    to: RouteLocationRaw;
  }>();
</script>
