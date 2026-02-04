import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@offkai/core": path.resolve(__dirname, "../../packages/domain/src"),
		},
	},
	build: {
		outDir: "dist",
	},
	server: {
		host: true,
	},
});
