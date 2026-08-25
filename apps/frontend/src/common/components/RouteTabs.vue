<template>
  <nav
    ref="navElement"
    class="relative"
    :aria-label="label"
  >
    <div
      ref="scrollElement"
      class="route-tabs-scroll overflow-x-auto"
      @scroll="updateOverflow"
    >
      <div
      :class="
        variant === 'equal'
          ? 'flex w-max min-w-full md:grid md:w-full md:grid-cols-[repeat(var(--tab-count),minmax(0,1fr))]'
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
            variant === 'equal' ? 'shrink-0 px-4 md:min-w-0 md:px-2' : 'shrink-0 px-4',
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
    </div>
    <div
      v-if="showStartFade"
      class="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center bg-gradient-to-r from-white via-white/90 to-transparent pl-1 text-slate-500"
      aria-hidden="true"
    >
      <FontAwesomeIcon :icon="faCaretLeft" />
    </div>
    <div
      v-if="showEndFade"
      class="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-1 text-slate-500"
      aria-hidden="true"
    >
      <FontAwesomeIcon :icon="faCaretRight" />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faCaretLeft, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { RouteTabItem } from "./RouteTabs.types";

const props = defineProps<{
  items: RouteTabItem[];
  label: string;
  variant?: "default" | "equal";
}>();

const route = useRoute();
const navElement = ref<HTMLElement | null>(null);
const scrollElement = ref<HTMLElement | null>(null);
const showStartFade = ref(false);
const showEndFade = ref(false);
let resizeObserver: ResizeObserver | null = null;

const updateOverflow = () => {
  const element = scrollElement.value;
  if (!element) return;
  const maximum = element.scrollWidth - element.clientWidth;
  showStartFade.value = element.scrollLeft > 1;
  showEndFade.value = maximum - element.scrollLeft > 1;
};

const revealActiveTab = async () => {
  await nextTick();
  const active = navElement.value?.querySelector<HTMLElement>('[aria-current="page"]');
  active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  updateOverflow();
};

onMounted(() => {
  resizeObserver = new ResizeObserver(updateOverflow);
  if (scrollElement.value) resizeObserver.observe(scrollElement.value);
  void revealActiveTab();
});

onBeforeUnmount(() => resizeObserver?.disconnect());
watch(() => route.fullPath, revealActiveTab);
watch(() => props.items.length, revealActiveTab);

const tabClass = (active: boolean) =>
  active
    ? "border-teal-500 bg-teal-50 text-teal-700"
    : "border-transparent bg-transparent text-gray-500 hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700";
</script>

<style scoped>
.route-tabs-scroll {
  scrollbar-width: none;
}

.route-tabs-scroll::-webkit-scrollbar {
  display: none;
}
</style>
