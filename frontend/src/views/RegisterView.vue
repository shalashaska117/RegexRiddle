<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "../api/client";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();

const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const pending = ref(false);
const banner = ref("");
const fieldErrors = ref<Record<string, string>>({});
const confirmError = ref("");

async function onSubmit(): Promise<void> {
  banner.value = "";
  fieldErrors.value = {};
  confirmError.value = "";
  if (password.value !== confirmPassword.value) {
    confirmError.value = "Passwords do not match.";
    return;
  }
  pending.value = true;
  try {
    await auth.register(username.value, password.value);
    await router.push("/challenges");
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        fieldErrors.value = { username: "This username is taken." };
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
      <h1 class="auth-title">Register</h1>
      <p v-if="banner" class="banner" role="alert">{{ banner }}</p>
      <form @submit.prevent="onSubmit">
        <div class="field">
          <label class="label" for="register-username">Username</label>
          <input
            id="register-username"
            v-model="username"
            class="input"
            type="text"
            autocomplete="username"
            required
            maxlength="32"
            :aria-invalid="fieldErrors.username ? 'true' : undefined"
            :aria-describedby="
              fieldErrors.username
                ? 'register-username-hint register-username-error'
                : 'register-username-hint'
            "
          />
          <p id="register-username-hint" class="hint">
            3-32 characters: lowercase letters, digits and underscore.
          </p>
          <p
            v-if="fieldErrors.username"
            id="register-username-error"
            class="error-text field-error"
          >
            {{ fieldErrors.username }}
          </p>
        </div>
        <div class="field">
          <label class="label" for="register-password">Password</label>
          <input
            id="register-password"
            v-model="password"
            class="input"
            type="password"
            autocomplete="new-password"
            required
            maxlength="128"
            :aria-invalid="fieldErrors.password ? 'true' : undefined"
            :aria-describedby="
              fieldErrors.password
                ? 'register-password-hint register-password-error'
                : 'register-password-hint'
            "
          />
          <p id="register-password-hint" class="hint">8-128 characters.</p>
          <p
            v-if="fieldErrors.password"
            id="register-password-error"
            class="error-text field-error"
          >
            {{ fieldErrors.password }}
          </p>
        </div>
        <div class="field">
          <label class="label" for="register-confirm">Confirm password</label>
          <input
            id="register-confirm"
            v-model="confirmPassword"
            class="input"
            type="password"
            autocomplete="new-password"
            required
            maxlength="128"
            :aria-invalid="confirmError ? 'true' : undefined"
            :aria-describedby="confirmError ? 'register-confirm-error' : undefined"
          />
          <p
            v-if="confirmError"
            id="register-confirm-error"
            class="error-text field-error"
          >
            {{ confirmError }}
          </p>
        </div>
        <button type="submit" class="btn" :disabled="pending">Register</button>
      </form>
      <p class="auth-alt muted">
        Already registered?
        <RouterLink to="/login">Log in</RouterLink>
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

.hint {
  color: var(--muted);
  font-size: 0.8rem;
  margin: 0.35rem 0 0;
}

.field-error {
  margin: 0.35rem 0 0;
}

.auth-alt {
  font-size: 0.9rem;
  margin: 1.25rem 0 0;
}
</style>
