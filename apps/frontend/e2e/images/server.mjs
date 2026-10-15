import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL(".", import.meta.url));
const frontend = fileURLToPath(new URL("../..", import.meta.url));
const workspace = fileURLToPath(new URL("../../../..", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  plugins: [vue()],
  resolve: {
    alias: {
      vue: require.resolve("vue/dist/vue.runtime.esm-bundler.js"),
      "@": `${frontend}/src`,
      "@offkai/core": `${workspace}/packages/core/src`,
    },
  },
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api") },
  css: {
    postcss: {
      plugins: [
        require("tailwindcss")({
          content: [`${frontend}/src/**/*.vue`, `${root}/*.vue`],
        }),
        require("autoprefixer")(),
      ],
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4176,
    strictPort: true,
    fs: { allow: [workspace] },
  },
});
await server.listen();
