<template>
  <nav class="overflow-x-auto" :aria-label="label">
    <div class="flex w-max min-w-full justify-center gap-1">
      <RouterLink
        v-for="item in items"
        :key="item.label"
        v-slot="{ href, navigate, isActive, isExactActive }"
        :to="item.to"
        custom
      >
        <a
          :href="href"
          class="inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          :class="tabClass(item.exact === false ? isActive : isExactActive)"
          :aria-current="(item.exact === false ? isActive : isExactActive) ? 'page' : undefined"
          @click="navigate"
        >
          <FontAwesomeIcon v-if="item.icon" :icon="item.icon" />
          {{ item.label }}
        </a>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import type { RouteTabItem } from "./RouteTabs.types";

  defineProps<{
    items: RouteTabItem[];
    label: string;
  }>();

  const tabClass = (active: boolean) =>
    active
      ? "border-teal-500 text-teal-700"
      : "border-transparent text-gray-500 hover:border-teal-200 hover:text-teal-700";
</script>
