import { createRouter, createWebHistory } from "vue-router";
import Answers from "../views/Answers.vue";
import AnswerList from "../views/Details.vue";
import HomeView from "../views/HomeView.vue";
import CreateOffkaiEvent from "../views/offkaiEvent/create.vue";
import EditOffkaiEvent from "../views/offkaiEvent/edit.vue";

const routes = [
	{ path: "/", component: HomeView },
	{ path: "/offkai/create", component: CreateOffkaiEvent },
	{ path: "/offkai/:id/edit", component: EditOffkaiEvent, props: true },
	{ path: "/offkai/join", component: Answers },
	{ path: "/offkai/details", component: AnswerList },
];

export const router = createRouter({
	history: createWebHistory(),
	routes,
});
