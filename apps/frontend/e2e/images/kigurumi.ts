import { createApp, h } from "vue";
import KigurumiImage from "../../src/features/kigurumi/components/KigurumiImage.vue";
import "../../src/style.css";
const edit = new URLSearchParams(location.search).has("edit");
createApp({ render: () => h("main", { class: "mx-auto max-w-xl p-4" }, [h(KigurumiImage, {
  kigurumiId: "test-kigurumi", label: "キャラ(作品)", eventId: "test-event", hasImage: !edit, editable: edit, thumbnail: edit,
})]) }).mount("#app");
