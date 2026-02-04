import { createApp, ref, onMounted } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "./style.css";

// とりあえずグローバルスタイルがあればここで読み込み
// import "./style.css";
const app = createApp(App);
app.use(router);
app.mount("#app");
