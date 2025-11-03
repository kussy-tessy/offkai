import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Experiment from '../views/Experiment.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/expt', component: Experiment },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
