import { createApp, ref, onMounted } from "vue";
import App from "./App.vue";
import {router} from './router'

// とりあえずグローバルスタイルがあればここで読み込み
// import "./style.css";

createApp(App).use(router).mount("#app");