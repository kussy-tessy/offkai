import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";

const harnessRoot = fileURLToPath(new URL(".", import.meta.url));
const frontendRoot = fileURLToPath(new URL("../..", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const require = createRequire(import.meta.url);
let apiHandler;
const server = await createServer({
	root: harnessRoot,
	configFile: false,
	plugins: [
		{
			name: "finance-ledger-e2e-api",
			configureServer(viteServer) {
				viteServer.middlewares.use("/api", (request, response, next) =>
					apiHandler(request, response, next),
				);
			},
		},
		vue(),
	],
	resolve: {
		alias: {
			"@": `${frontendRoot}/src`,
			"@offkai/core": `${workspaceRoot}/packages/core/src`,
			vue: require.resolve("vue/dist/vue.runtime.esm-bundler.js"),
			"vue-router": require.resolve("vue-router"),
		},
	},
	define: {
		"import.meta.env.VITE_API_BASE_URL": JSON.stringify(
			"http://127.0.0.1:4175/api",
		),
	},
	css: {
		postcss: {
			plugins: [
				require("tailwindcss")({
					content: [`${frontendRoot}/src/**/*.{vue,ts}`],
				}),
				require("autoprefixer")(),
			],
		},
	},
	server: {
		port: 4175,
		host: "127.0.0.1",
		fs: { allow: [workspaceRoot] },
	},
});

const core = await server.ssrLoadModule(
	`${workspaceRoot}/packages/core/src/index.ts`,
);
function createState() {
	const state = core.FinanceLedgerSchema.parse({
		version: 1,
		inputRevision: 0,
		roundingUnit: 1,
		people: [
			{ id: "a", name: "通常参加A" },
			{ id: "b", name: "通常参加B" },
			{ id: "c", name: "途中参加C" },
		],
		categories: [
			{
				id: "day",
				questionId: "q-day",
				name: "日ロケ",
				baseAmount: 4000,
				memberIds: ["a", "b", "c"],
			},
			{
				id: "night",
				questionId: "q-night",
				name: "土泊",
				baseAmount: 10000,
				memberIds: ["a", "b"],
			},
		],
		items: [],
		charges: [],
		expenses: [
			{
				id: "ferry",
				categoryId: "day",
				itemId: null,
				title: "フェリー代",
				amount: 6000,
				kind: "expense",
				allocation: {
					mode: "weights",
					rows: [
						{ personId: "a", value: 1 },
						{ personId: "b", value: 1 },
						{ personId: "c", value: 0 },
					],
				},
				payerId: null,
				recipients: [],
				note: "",
			},
		],
		incomes: [],
		adjustments: [],
		payments: [],
		snapshot: null,
		migrationNotes: [],
	});
	core.syncBasicCharges(state);
	return state;
}

let state = createState();
let revision = 0;
const page = () => ({
	active: true,
	revision,
	fingerprint: null,
	access: { owner: true, permissions: core.LegacyStaffPermissions },
	state,
	calculation: core.calculateFinanceLedger(state),
	questions: [
		{ id: "q-day", label: "日ロケ", personIds: ["a", "b", "c"] },
		{ id: "q-night", label: "土泊", personIds: ["a", "b"] },
	],
});
apiHandler = async (request, response) => {
	response.setHeader("Content-Type", "application/json");
	try {
		if (request.url === "/reset") {
			state = createState();
			revision = 0;
			response.end("{}");
			return;
		}
		if (request.url?.endsWith("/history")) {
			response.end("[]");
			return;
		}
		if (request.method === "POST") {
			let body = "";
			for await (const chunk of request) body += chunk;
			const command = core.LedgerCommandSchema.parse(JSON.parse(body));
			if (command.revision !== revision) throw new Error("同時更新");
			state = core.applyLedgerCommand(
				state,
				command,
				"owner",
				new Date().toISOString(),
			);
			revision++;
		}
		response.end(JSON.stringify(page()));
	} catch (error) {
		response.statusCode = 400;
		response.end(
			JSON.stringify({
				message: error instanceof Error ? error.message : String(error),
			}),
		);
	}
};

await server.listen();
console.log("Finance ledger E2E server: http://127.0.0.1:4175");
