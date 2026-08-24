<template>
  <nav
    :class="variant === 'equal' ? '' : 'overflow-x-auto'"
    :aria-label="label"
  >
    <div
      :class="
        variant === 'equal'
          ? 'grid w-full grid-cols-[repeat(var(--tab-count),minmax(0,1fr))]'
          : 'flex w-max min-w-full justify-center gap-1'
      "
      :style="variant === 'equal' ? { '--tab-count': items.length } : undefined"
    >
      <RouterLink
        v-for="item in items"
        :key="item.label"
        v-slot="{ href, navigate, isActive, isExactActive }"
        :to="item.to"
        custom
      >
        <a
          :href="href"
          class="inline-flex items-center justify-center gap-2 border-b-2 px-2 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          :class="[
            tabClass(item.exact === false ? isActive : isExactActive),
            variant === 'equal' ? 'min-w-0' : 'shrink-0 px-4',
          ]"
          :aria-current="
            (item.exact === false ? isActive : isExactActive)
              ? 'page'
              : undefined
          "
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
  variant?: "default" | "equal";
}>();

const tabClass = (active: boolean) =>
  active
    ? "border-teal-500 bg-teal-50 text-teal-700"
    : "border-transparent bg-transparent text-gray-500 hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700";
</script>
