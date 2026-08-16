<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { usePrefsStore, TEXT_SCALES } from "./stores/prefs";
import type {
  FontPreference,
  TextScale,
  ThemePreference,
} from "./stores/prefs";

const auth = useAuthStore();
const prefs = usePrefsStore();
const router = useRouter();

async function onLogout(): Promise<void> {
  await auth.logout();
  await router.push("/");
}

function onFontChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as FontPreference;
  prefs.setFont(value);
}

function onTextScaleChange(event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value) as TextScale;
  prefs.setTextScale(value);
}

function onThemeChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as ThemePreference;
  prefs.setTheme(value);
}
</script>

<template>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <nav class="nav" aria-label="Main">
      <RouterLink to="/" class="brand"
        ><span class="brand-slash">/</span>R<span class="brand-group">(egex)?</span
        >Riddle<span class="brand-slash">/</span></RouterLink
      >
      <RouterLink v-if="auth.user" to="/challenges" class="nav-link"
        >Challenges</RouterLink
      >
      <RouterLink v-if="auth.user" to="/leaderboard" class="nav-link"
        >Leaderboard</RouterLink
      >
      <RouterLink to="/how-to-play" class="nav-link">How to play</RouterLink>
      <RouterLink to="/tutorial" class="nav-link">Learn regex</RouterLink>
      <div class="nav-right">
        <template v-if="auth.user">
          <RouterLink to="/profile" class="profile-link">
            <img
              v-if="auth.user.avatarUrl"
              :src="auth.user.avatarUrl"
              alt=""
              class="avatar"
            />
            <span v-else class="avatar avatar-letter" aria-hidden="true">{{
              auth.user.username[0]
            }}</span>
            <span>{{ auth.user.username }}</span>
          </RouterLink>
          <button type="button" class="btn" @click="onLogout">Log out</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="nav-link">Log in</RouterLink>
          <RouterLink to="/register" class="nav-link">Register</RouterLink>
        </template>
      </div>
    </nav>
  </header>

  <main id="main-content" class="page" tabindex="-1">
    <RouterView />
  </main>

  <footer class="site-footer">
    <div class="footer-inner" role="group" aria-label="Accessibility options">
      <span class="footer-field">
        <label class="label footer-label" for="font-select">Font</label>
        <select
          id="font-select"
          class="input footer-select"
          :value="prefs.font"
          @change="onFontChange"
        >
          <option value="atkinson">Atkinson Hyperlegible</option>
          <option value="opendyslexic">OpenDyslexic</option>
        </select>
      </span>
      <span class="footer-field">
        <label class="label footer-label" for="scale-select">Text size</label>
        <select
          id="scale-select"
          class="input footer-select"
          :value="String(prefs.textScale)"
          @change="onTextScaleChange"
        >
          <option v-for="scale in TEXT_SCALES" :key="scale" :value="String(scale)">
            {{ scale }}%
          </option>
        </select>
      </span>
      <span class="footer-field">
        <label class="label footer-label" for="theme-select">Theme</label>
        <select
          id="theme-select"
          class="input footer-select"
          :value="prefs.theme"
          @change="onThemeChange"
        >
          <option value="graphite">Graphite dark</option>
          <option value="light">High contrast light</option>
        </select>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.site-header {
  background: var(--panel);
  border-bottom: 1px solid var(--hairline);
}

.nav {
  max-width: 60rem;
  margin: 0 auto;
  padding: 0.7rem 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
}

.brand {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--text);
  text-decoration: none;
}

.brand:hover {
  color: var(--text-bright);
  text-decoration: none;
}

.brand-slash {
  color: var(--muted);
}

.brand-group {
  color: var(--accent);
}

.nav-link {
  color: var(--muted);
  font-size: 0.68rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  text-decoration: none;
  padding-bottom: 2px;
  border-bottom: 1px solid transparent;
}

.nav-link:hover {
  color: var(--text);
  text-decoration: none;
}

.nav-link.router-link-active {
  color: var(--text-bright);
  border-bottom-color: var(--accent);
}

.nav-right {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
}

.profile-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text);
  font-size: 0.9rem;
  text-decoration: none;
}

.profile-link:hover {
  color: var(--text-bright);
  text-decoration: none;
}

.avatar {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-letter {
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  text-transform: uppercase;
}

main.page {
  flex: 1;
  width: 100%;
}

.site-footer {
  border-top: 1px solid var(--hairline);
}

.footer-inner {
  max-width: 60rem;
  margin: 0 auto;
  padding: 0.8rem 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
}

.footer-field {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-label {
  margin-bottom: 0;
}

.footer-select {
  width: auto;
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
}

main.page:focus {
  outline: none;
}
</style>
