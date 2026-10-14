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
      component: /**
       * Load the game instructions view when its route is visited.
       * Parameters: none.
       * @returns Promise of the HowToPlayView component module.
       */
      () => import("../views/HowToPlayView.vue"),
      meta: { title: "How to play" },
    },
    {
      path: "/tutorial",
      name: "tutorial",
      component: /**
       * Load the regex tutorial view when its route is visited.
       * Parameters: none.
       * @returns Promise of the TutorialView component module.
       */
      () => import("../views/TutorialView.vue"),
      meta: { title: "Learn regex" },
    },
    {
      path: "/login",
      name: "login",
      component: /**
       * Load the login view when its route is visited.
       * Parameters: none.
       * @returns Promise of the LoginView component module.
       */
      () => import("../views/LoginView.vue"),
      meta: { guestOnly: true, title: "Log in" },
    },
    {
      path: "/register",
      name: "register",
      component: /**
       * Load the registration view when its route is visited.
       * Parameters: none.
       * @returns Promise of the RegisterView component module.
       */
      () => import("../views/RegisterView.vue"),
      meta: { guestOnly: true, title: "Register" },
    },
    {
      path: "/challenges",
      name: "challenges",
      component: /**
       * Load the challenge list view when its route is visited.
       * Parameters: none.
       * @returns Promise of the ChallengesView component module.
       */
      () => import("../views/ChallengesView.vue"),
      meta: { requiresAuth: true, title: "Challenges" },
    },
    {
      path: "/challenges/new",
      name: "challenge-create",
      component: /**
       * Load the challenge creation view when its route is visited.
       * Parameters: none.
       * @returns Promise of the ChallengeCreateView component module.
       */
      () => import("../views/ChallengeCreateView.vue"),
      meta: { requiresAuth: true, title: "New challenge" },
    },
    // No title meta: the view sets the tab title to the riddle's own title
    // once it loads.
    {
      path: "/challenges/:id",
      name: "challenge-detail",
      component: /**
       * Load the challenge detail view when its route is visited.
       * Parameters: none.
       * @returns Promise of the ChallengeDetailView component module.
       */
      () => import("../views/ChallengeDetailView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: /**
       * Load the profile view when its route is visited.
       * Parameters: none.
       * @returns Promise of the ProfileView component module.
       */
      () => import("../views/ProfileView.vue"),
      meta: { requiresAuth: true, title: "Profile" },
    },
    {
      path: "/leaderboard",
      name: "leaderboard",
      component: /**
       * Load the leaderboard view when its route is visited.
       * Parameters: none.
       * @returns Promise of the LeaderboardView component module.
       */
      () => import("../views/LeaderboardView.vue"),
      meta: { requiresAuth: true, title: "Leaderboard" },
    },
    // Public on purpose: an unknown URL answers the same way logged in or
    // out, instead of bouncing to login and hinting at which paths exist.
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: /**
       * Load the not-found view when its route is visited.
       * Parameters: none.
       * @returns Promise of the NotFoundView component module.
       */
      () => import("../views/NotFoundView.vue"),
      meta: { title: "Page not found" },
    },
  ],
});

router.afterEach(/**
 * Set the browser tab title after navigation.
 * @param to - Route that navigation has reached.
 * @returns Nothing; updates document.title from the route metadata.
 */
(to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} - RegexRiddle` : "RegexRiddle";
});

router.beforeEach(/**
 * Restore session state and enforce route access rules.
 * @param to - Destination route, including its access metadata and full path.
 * @returns Promise of a login/challenge redirect, or undefined to allow navigation.
 */
async (to) => {
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
