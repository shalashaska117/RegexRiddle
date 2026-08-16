import { createRouter, createWebHistory } from "vue-router";
import LandingView from "../views/LandingView.vue";
import { useAuthStore } from "../stores/auth";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingView },
    {
      path: "/how-to-play",
      name: "how-to-play",
      component: () => import("../views/HowToPlayView.vue"),
      meta: { title: "How to play" },
    },
    {
      path: "/tutorial",
      name: "tutorial",
      component: () => import("../views/TutorialView.vue"),
      meta: { title: "Learn regex" },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
      meta: { guestOnly: true, title: "Log in" },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("../views/RegisterView.vue"),
      meta: { guestOnly: true, title: "Register" },
    },
    {
      path: "/challenges",
      name: "challenges",
      component: () => import("../views/ChallengesView.vue"),
      meta: { requiresAuth: true, title: "Challenges" },
    },
    {
      path: "/challenges/new",
      name: "challenge-create",
      component: () => import("../views/ChallengeCreateView.vue"),
      meta: { requiresAuth: true, title: "New challenge" },
    },
    // No title meta: the view sets the tab title to the riddle's own title
    // once it loads.
    {
      path: "/challenges/:id",
      name: "challenge-detail",
      component: () => import("../views/ChallengeDetailView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("../views/ProfileView.vue"),
      meta: { requiresAuth: true, title: "Profile" },
    },
    {
      path: "/leaderboard",
      name: "leaderboard",
      component: () => import("../views/LeaderboardView.vue"),
      meta: { requiresAuth: true, title: "Leaderboard" },
    },
    // Public on purpose: an unknown URL answers the same way logged in or
    // out, instead of bouncing to login and hinting at which paths exist.
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("../views/NotFoundView.vue"),
      meta: { title: "Page not found" },
    },
  ],
});

router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} - RegexRiddle` : "RegexRiddle";
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  try {
    await auth.bootstrap();
  } catch {
    // A failed bootstrap counts as logged out for this navigation.
  }
  if (to.meta.requiresAuth && !auth.user) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && auth.user) {
    return { name: "challenges" };
  }
});
