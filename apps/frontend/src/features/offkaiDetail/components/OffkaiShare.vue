<template>
  <div class="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
    <label for="offkai-share-text" class="block font-medium text-gray-700">このオフ会をシェア</label>
    <textarea id="offkai-share-text" ref="shareTextArea" :value="shareText" readonly rows="4"
      aria-describedby="offkai-share-help"
      class="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
      @click="selectShareText"></textarea>
    <div class="flex flex-wrap items-center justify-end gap-3">
      <MyButton type="button" size="sm" :disabled="copying" @click="copyShareText">コピー</MyButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from "vue";
  import { useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";
  import { useToast } from "@/common/composables";

  const props = defineProps<{ eventId: string; title: string }>();
  const router = useRouter();
  const { success, error } = useToast();
  const shareTextArea = ref<HTMLTextAreaElement | null>(null);
  const copying = ref(false);
  const shareText = computed(() => {
    const path = router.resolve(`/offkai/${encodeURIComponent(props.eventId)}/overview`).href;
    const url = new URL(path, window.location.origin).href;
    return `${props.title}\n詳細・参加表明はこちら！\n${url}`;
  });

  const selectShareText = () => {
    const textarea = shareTextArea.value;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
  };

  const copyShareText = async () => {
    if (copying.value) return;
    copying.value = true;
    try {
      await navigator.clipboard.writeText(shareText.value);
      success("共有文をコピーしました。");
    } catch {
      selectShareText();
      error("コピーできませんでした。テキスト欄の選択された文を手動でコピーしてください。");
    } finally {
      copying.value = false;
    }
  };
</script>
