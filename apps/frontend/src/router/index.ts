import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/common/composables";
import Answers from "../views/Answers.vue";
import AnswerList from "../views/Details.vue";
import HomeView from "../views/HomeView.vue";
import Login from "../views/LoginPage.vue";
import CreateOffkaiEvent from "../views/offkaiEvent/create.vue";
import EditOffkaiEvent from "../views/offkaiEvent/edit.vue";
import Signup from "../views/SignupPage.vue";

const requiresAuth = { meta: { requiresAuth: true } };
const routes = [
	{ path: "/", component: HomeView },
	{ path: "/offkai/create", component: CreateOffkaiEvent, ...requiresAuth },
	{
		path: "/offkai/:id/edit",
		component: EditOffkaiEvent,
		props: true,
		...requiresAuth,
	},
	{ path: "/offkai/join", component: Answers, ...requiresAuth },
	{ path: "/offkai/details", component: AnswerList, ...requiresAuth },
	{ path: "/login", component: Login },
	{ path: "/signup", component: Signup },
];

export const router = createRouter({
	history: createWebHistory(),
	routes,
});
router.beforeEach(async (to) => {
	const { user, fetchMe } = useAuth();

	if (user.value === null) {
		await fetchMe();
		console.log({ user: user.value })
	}

	if (to.meta.requiresAuth && !user.value) {
		return "/login";
	}

	if ((to.path === "/login" || to.path === "/signup") && user.value) {
		return "/";
	}
});
