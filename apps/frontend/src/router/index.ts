import {
	createRouter,
	createWebHistory,
	type RouteLocationGeneric,
} from "vue-router";
import { useAuth } from "@/common/composables";
import DiscordManagement from "@/features/participantManagement/pages/DiscordManagement.vue";
import FeeCalculation from "@/features/participantManagement/pages/finance/calculation/FeeCalculation.vue";
import FeeCollection from "@/features/participantManagement/pages/finance/collection/FeeCollection.vue";
import FinanceLayout from "@/features/participantManagement/pages/finance/FinanceLayout.vue";
import Refund from "@/features/participantManagement/pages/finance/refund/Refund.vue";
import Settlement from "@/features/participantManagement/pages/finance/settlement/Settlement.vue";
import PaymentManagement from "@/features/participantManagement/pages/legacy/PaymentManagement.vue";
import ParticipantAnswerTable from "@/features/participantManagement/pages/ParticipantAnswerTable.vue";
import Account from "../views/AccountPage.vue";
import CreateAnswer from "../views/answer/form.vue";
import AnswerList from "../views/answerList/detail.vue";
import DiscordOnboarding from "../views/DiscordOnboardingPage.vue";
import Dashboard from "../views/dashboard/Dashboard.vue";
import Login from "../views/LoginPage.vue";
import CreateOffkaiEvent from "../views/offkaiEvent/create.vue";
import EditOffkaiEvent from "../views/offkaiEvent/edit.vue";
import EditParticipantGuide from "../views/offkaiEvent/editParticipantGuide.vue";
import OffkaiOverview from "../views/offkaiEvent/overview.vue";
import ParticipantGuide from "../views/offkaiEvent/participantGuide.vue";
import Participants from "../views/offkaiEvent/participants.vue";
import PhotoShare from "../views/photoShare/index.vue";
import Signup from "../views/SignupPage.vue";
import QuestionTemplate from "../views/series/questionTemplate.vue";

const requiresAuth = { meta: { requiresAuth: true } };
const routes = [
	{ path: "/dashboard", component: Dashboard, ...requiresAuth },
	{ path: "/account", component: Account, ...requiresAuth },
	{
		path: "/onboarding/discord",
		component: DiscordOnboarding,
		...requiresAuth,
	},
	{
		path: "/offkai/create",
		component: CreateOffkaiEvent,
		meta: { requiresAuth: true, requiresSeriesOwner: true },
	},
	{
		path: "/series/question-template",
		component: QuestionTemplate,
		meta: { requiresAuth: true, requiresSeriesOwner: true },
	},
	{
		path: "/offkai/:id/edit",
		component: EditOffkaiEvent,
		props: true,
		meta: { requiresAuth: true, requiresSeriesOwner: true },
	},
	{
		path: "/offkai/:id/participant-guide/edit",
		component: EditParticipantGuide,
		props: true,
		meta: { requiresAuth: true, requiresSeriesOwner: true },
	},
	{
		path: "/offkai/:id/answers/:userId/edit",
		component: CreateAnswer,
		props: true,
		...requiresAuth,
	},
	{
		path: "/offkai/:id/guests/new",
		component: CreateAnswer,
		props: (route: RouteLocationGeneric) => ({
			id: String(route.params.id),
			createGuest: true,
		}),
		...requiresAuth,
	},
	{
		path: "/offkai/:id/guests/:answerId/edit",
		component: CreateAnswer,
		props: true,
		...requiresAuth,
	},
	{
		path: "/offkai/:id/join",
		component: CreateAnswer,
		props: true,
		...requiresAuth,
	},
	{
		path: "/offkai/:id/overview",
		component: OffkaiOverview,
		props: true,
	},
	{
		path: "/offkai/:id/participant-guide",
		component: ParticipantGuide,
		props: true,
		...requiresAuth,
	},
	{
		path: "/offkai/:id/answers",
		component: AnswerList,
		props: true,
	},
	{
		path: "/offkai/:id",
		redirect: (to: RouteLocationGeneric) =>
			`/offkai/${String(to.params.id)}/overview`,
	},
	{
		path: "/offkai/:id/participants",
		component: Participants,
		props: true,
		...requiresAuth,
		children: [
			{
				path: "",
				redirect: (to: RouteLocationGeneric) =>
					`/offkai/${String(to.params.id)}/participants/discord`,
			},
			{
				path: "discord",
				component: DiscordManagement,
				props: (route: RouteLocationGeneric) => ({
					eventId: String(route.params.id),
				}),
			},
			{
				path: "finance",
				component: FinanceLayout,
				props: (route: RouteLocationGeneric) => ({
					eventId: String(route.params.id),
				}),
				children: [
					{
						path: "",
						redirect: (to: RouteLocationGeneric) =>
							`/offkai/${String(to.params.id)}/participants/finance/calculation`,
					},
					{
						path: "calculation",
						component: FeeCalculation,
						props: (route: RouteLocationGeneric) => ({
							eventId: String(route.params.id),
						}),
					},
					{
						path: "collection",
						component: FeeCollection,
						props: (route: RouteLocationGeneric) => ({
							eventId: String(route.params.id),
						}),
					},
					{
						path: "settlement",
						component: Settlement,
						props: (route: RouteLocationGeneric) => ({
							eventId: String(route.params.id),
						}),
					},
					{
						path: "refund",
						component: Refund,
						props: (route: RouteLocationGeneric) => ({
							eventId: String(route.params.id),
						}),
					},
				],
			},
			{
				path: "fee-calculation",
				redirect: (to: RouteLocationGeneric) =>
					`/offkai/${String(to.params.id)}/participants/finance/calculation`,
			},
			{
				path: "fee-collection",
				redirect: (to: RouteLocationGeneric) =>
					`/offkai/${String(to.params.id)}/participants/finance/collection`,
			},
			{
				path: "payments",
				redirect: (to: RouteLocationGeneric) =>
					`/offkai/${String(to.params.id)}/participants/finance/collection`,
			},
			{
				path: "legacy-payments",
				component: PaymentManagement,
				props: (route: RouteLocationGeneric) => ({
					eventId: String(route.params.id),
				}),
			},
			{
				path: "answers",
				component: ParticipantAnswerTable,
				props: (route: RouteLocationGeneric) => ({
					eventId: String(route.params.id),
				}),
			},
		],
	},
	{
		path: "/offkai/:id/photos",
		component: PhotoShare,
		props: true,
		...requiresAuth,
	},
	{ path: "/login", component: Login },
	{ path: "/signup", component: Signup },
	{ path: "/", redirect: () => "/dashboard" },
];

export const router = createRouter({
	history: createWebHistory(),
	routes,
});
router.beforeEach(async (to) => {
	const { user, fetchMe } = useAuth();

	if (user.value === null) {
		try {
			await fetchMe();
		} catch (error: unknown) {
			const status =
				typeof error === "object" && error !== null && "response" in error
					? (error as { response?: { status?: number } }).response?.status
					: undefined;
			// 401エラーはセッション切れ
			if (status === 401) {
				user.value = null;
				if (to.meta.requiresAuth) {
					return "/login";
				}
			}
		}
	}

	if (to.meta.requiresAuth && !user.value) {
		return { path: "/login", query: { redirect: to.fullPath } };
	}

	if (to.meta.requiresSeriesOwner && !user.value?.isSeriesOwner) {
		return "/dashboard";
	}

	if ((to.path === "/login" || to.path === "/signup") && user.value) {
		return "/dashboard";
	}
});
