<script setup lang="ts">
import PhotoSwipe from "photoswipe";
import "photoswipe/style.css";
import { onBeforeUnmount, watch } from "vue";
import type { ViewerImage } from "./ImageUploader.types";

const props = defineProps<{
  open: boolean;
  image?: ViewerImage | null;
  images?: ViewerImage[];
  initialIndex?: number;
}>();
const emit = defineEmits<{
  "update:open": [open: boolean];
  error: [message: string];
}>();
let viewer: PhotoSwipe | undefined;

function destroy() {
  const current = viewer;
  viewer = undefined;
  current?.destroy();
}
watch(
  () => [
    props.open,
    props.images,
    props.initialIndex,
    props.image?.src,
    props.image?.width,
    props.image?.height,
    props.image?.alt,
  ],
  () => {
    destroy();
    if (!props.open) return;
    const images = props.images ?? (props.image ? [props.image] : []);
    if (
      !images.length ||
      images.some(
        (image) =>
          !image?.src ||
          !Number.isFinite(image.width) ||
          !Number.isFinite(image.height) ||
          image.width <= 0 ||
          image.height <= 0,
      )
    ) {
      emit("error", "画像URLと正しい画像サイズが必要です。");
      emit("update:open", false);
      return;
    }
    const instance = new PhotoSwipe({
      dataSource: images.map((image) => ({
        ...image,
        alt: image.alt ?? "画像",
      })),
      index: Math.max(
        0,
        Math.min(images.length - 1, Math.trunc(props.initialIndex ?? 0) || 0),
      ),
      loop: false,
      arrowPrev: images.length > 1,
      arrowNext: images.length > 1,
      counter: images.length > 1,
      arrowPrevTitle: "前の画像",
      arrowNextTitle: "次の画像",
      closeTitle: "閉じる",
      zoomTitle: "拡大・縮小",
      errorMsg: "画像を読み込めませんでした。閉じてから再度お試しください。",
      showHideAnimationType: "none",
      maxZoomLevel: 4,
      pinchToClose: false,
    });
    viewer = instance;
    instance.on("destroy", () => {
      if (viewer === instance) viewer = undefined;
    });
    instance.on("close", () => {
      if (viewer === instance) emit("update:open", false);
    });
    instance.on("loadError", () =>
      emit("error", "画像を読み込めませんでした。"),
    );
    instance.init();
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(destroy);
</script>

<template>
  <!-- PhotoSwipe mounts its accessible dialog directly into body. -->
</template>
