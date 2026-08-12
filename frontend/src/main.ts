import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/600.css";
import "@fontsource/atkinson-hyperlegible-mono/400.css";
import "./assets/theme.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { usePrefsStore } from "./stores/prefs";

const app = createApp(App).use(createPinia()).use(router);

// Apply the stored font class before mount to avoid a flash.
usePrefsStore();

app.mount("#app");
