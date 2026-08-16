<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ApiError } from "../api/client";
import { useAuthStore } from "../stores/auth";
import PasswordInput from "../components/PasswordInput.vue";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const username = ref("");
const password = ref("");
const pending = ref(false);
const banner = ref("");
const fieldErrors = ref<Record<string, string>>({});

// Only in-app paths; refuses absolute and protocol-relative URLs from the query.
function redirectTarget(): string {
  const redirect = route.query.redirect;
  if (
    typeof redirect === "string" &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//")
  ) {
    return redirect;
  }
  return "/challenges";
}

async function onSubmit(): Promise<void> {
  banner.value = "";
  fieldErrors.value = {};
  pending.value = true;
  try {
    await auth.login(username.value, password.value);
    await router.push(redirectTarget());
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        banner.value = "Wrong username or password.";
      } else if (err.status === 429) {
        banner.value = "Too many tries, wait a minute.";
      } else if (Object.keys(err.fieldErrors).length > 0) {
        fieldErrors.value = err.fieldErrors;
      } else {
        banner.value = err.message;
      }
    } else {
      banner.value = "Something went wrong. Try again.";
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="card auth-card">
      <h1 class="auth-title">Log in</h1>
      <p v-if="banner" class="banner" role="alert">{{ banner }}</p>
      <form @submit.prevent="onSubmit">
        <div class="field">
          <label class="label" for="login-username">Username</label>
          <input
            id="login-username"
            v-model="username"
            class="input"
            type="text"
            autocomplete="username"
            required
            :aria-invalid="fieldErrors.username ? 'true' : undefined"
            :aria-describedby="fieldErrors.username ? 'login-username-error' : undefined"
          />
          <p
            v-if="fieldErrors.username"
            id="login-username-error"
            class="error-text field-error"
          >
            {{ fieldErrors.username }}
          </p>
        </div>
        <div class="field">
          <label class="label" for="login-password">Password</label>
          <PasswordInput
            id="login-password"
            v-model="password"
            label="password"
            autocomplete="current-password"
            required
            :invalid="Boolean(fieldErrors.password)"
            :describedby="fieldErrors.password ? 'login-password-error' : undefined"
          />
          <p
            v-if="fieldErrors.password"
            id="login-password-error"
            class="error-text field-error"
          >
            {{ fieldErrors.password }}
          </p>
        </div>
        <button type="submit" class="btn" :disabled="pending">Log in</button>
      </form>
      <p class="auth-alt muted">
        No account yet?
        <RouterLink to="/register">Register</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  display: flex;
  justify-content: center;
  padding-top: 1.5rem;
}

.auth-card {
  width: 100%;
  max-width: 24rem;
}

.auth-title {
  font-size: 1.3rem;
  margin: 0 0 1rem;
}

.banner {
  border: 1px solid var(--err);
  border-radius: 5px;
  color: var(--err);
  font-size: 0.9rem;
  padding: 0.5rem 0.65rem;
  margin: 0 0 1rem;
}

.field {
  margin-bottom: 1rem;
}

.field-error {
  margin: 0.35rem 0 0;
}

.auth-alt {
  font-size: 0.9rem;
  margin: 1.25rem 0 0;
}
</style>
