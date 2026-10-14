import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/600.css";
import "@fontsource/atkinson-hyperlegible-mono/400.css";
import "./assets/theme.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { usePrefsStore } from "./stores/prefs";
import { useAuthStore } from "./stores/auth";
import { setAuthenticationRequiredHandler } from "./api/client";

const app = createApp(App).use(createPinia());
const auth = useAuthStore();

setAuthenticationRequiredHandler(/**
 * Clear an expired session and send protected pages to login.
 * Parameters: none.
 * @returns Nothing; clears authentication state and starts a redirect when required.
 */
() => {
  const wasSignedIn = auth.user !== null;
  auth.clearSession();
  const currentRoute = router.currentRoute.value;
  if (wasSignedIn && currentRoute.meta.requiresAuth) {
    void router.replace({ name: "login", query: { redirect: currentRoute.fullPath } });
  }
});

app.use(router);

// Apply the stored font class before mount to avoid a flash.
usePrefsStore();

app.mount("#app");
