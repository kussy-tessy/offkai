<template>
  <PhotoShare :id="id" />
</template>

<script setup lang="ts">
  import PhotoShare from "@/features/photoShare/components/PhotoShare.vue";

  defineProps<{
    id: string;
  }>();
</script>
