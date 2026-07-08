import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/common/composables";
import CreateAnswer from "../views/answer/form.vue";
import AnswerList from "../views/answerList/detail.vue";
import Account from "../views/AccountPage.vue";
import Dashboard from "../views/dashboard/Dashboard.vue";
import Login from "../views/LoginPage.vue";
import CreateOffkaiEvent from "../views/offkaiEvent/create.vue";
import EditOffkaiEvent from "../views/offkaiEvent/edit.vue";
import PhotoShare from "../views/photoShare/index.vue";
import QuestionTemplate from "../views/series/questionTemplate.vue";
import Signup from "../views/SignupPage.vue";

const requiresAuth = { meta: { requiresAuth: true } };
const routes = [
	{ path: "/dashboard", component: Dashboard, ...requiresAuth },
	{ path: "/account", component: Account, ...requiresAuth },
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
		path: "/offkai/:id/answers/:userId/edit",
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
		path: "/offkai/:id/detail",
		component: AnswerList,
		props: true,
		...requiresAuth,
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
		return "/login";
	}

	if (to.meta.requiresSeriesOwner && !user.value?.isSeriesOwner) {
		return "/dashboard";
	}

	if ((to.path === "/login" || to.path === "/signup") && user.value) {
		return "/dashboard";
	}
});
