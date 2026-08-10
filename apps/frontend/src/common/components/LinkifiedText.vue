<template>
  <template v-for="(part, index) in parts" :key="index">
    <a v-if="part.url" :href="part.url" target="_blank" rel="noopener noreferrer"
      class="break-all text-sky-600 underline hover:text-sky-700">{{ part.text }}</a><template v-else>{{ part.text
      }}</template>
  </template>
</template>

<script setup lang="ts">
  import { computed } from "vue";

  const props = defineProps<{
    text: string;
  }>();

  const parts = computed(() => {
    const parts: Array<{ text: string; url?: string }> = [];
    const urlPattern = /https?:\/\/[^\s<>"'）】」』、。！？]+/gu;
    let previousEnd = 0;

    for (const match of props.text.matchAll(urlPattern)) {
      const start = match.index;
      if (start > previousEnd) {
        parts.push({ text: props.text.slice(previousEnd, start) });
      }

      const candidate = match[0];
      const url = candidate.replace(/[.,!?;:]+$/u, "");
      parts.push({ text: url, url });

      const trailingText = candidate.slice(url.length);
      if (trailingText) parts.push({ text: trailingText });
      previousEnd = start + candidate.length;
    }

    if (previousEnd < props.text.length) {
      parts.push({ text: props.text.slice(previousEnd) });
    }

    return parts;
  });
</script>
