import { createApp, h } from "vue";
import { createRouter, createWebHistory, RouterLink } from "vue-router";
import LedgerWorkspace from "../../src/features/participantManagement/pages/finance/ledger/LedgerWorkspace.vue";
import "../../src/style.css";

const tabs = [
	["calculation", "請求"],
	["collection", "徴収"],
	["settlement", "経費精算"],
	["refund", "返金"],
] as const;
const router = createRouter({
	history: createWebHistory(),
	routes: [{ path: "/:tab", component: { render: () => null } }],
});
const Root = {
	setup() {
		return () =>
			h("main", { class: "mx-auto max-w-6xl space-y-4 p-4" }, [
				h(
					"nav",
					{ class: "flex gap-5" },
					tabs.map(([path, label]) =>
						h(RouterLink, { to: `/${path}` }, () => label),
					),
				),
				h(LedgerWorkspace, { eventId: "fixture" }),
			]);
	},
};

createApp(Root).use(router).mount("#app");
