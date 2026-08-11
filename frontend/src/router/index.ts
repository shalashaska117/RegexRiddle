import { createRouter, createWebHistory } from "vue-router";
import LandingView from "../views/LandingView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingView },
    {
      path: "/how-to-play",
      name: "how-to-play",
      component: () => import("../views/HowToPlayView.vue"),
    },
  ],
});
