<script setup lang="ts">
import { computed, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { changePassword, uploadAvatar } from "../api/users";
import { ApiError } from "../api/client";

const auth = useAuthStore();

const memberSince = computed<string>(() => {
  if (!auth.user) return "";
  return new Date(auth.user.createdAt).toLocaleDateString("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

const MAX_AVATAR_BYTES = 1024 * 1024;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

const avatarInput = ref<HTMLInputElement | null>(null);
const avatarFile = ref<File | null>(null);
const avatarError = ref("");
const avatarBanner = ref("");
const avatarUpdated = ref(false);
const avatarPending = ref(false);

function onAvatarChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  avatarError.value = "";
  avatarBanner.value = "";
  avatarUpdated.value = false;
  avatarFile.value = null;
  if (!file) return;
  if (!AVATAR_TYPES.includes(file.type)) {
    avatarError.value = "Choose a png, jpeg or webp image.";
    return;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    avatarError.value = "The file is larger than 1 MB.";
    return;
  }
  avatarFile.value = file;
}

async function onAvatarSubmit(): Promise<void> {
  if (!avatarFile.value || avatarPending.value) return;
  avatarPending.value = true;
  avatarError.value = "";
  avatarBanner.value = "";
  avatarUpdated.value = false;
  try {
    const { avatarUrl } = await uploadAvatar(avatarFile.value);
    if (auth.user) {
      // The URL never changes, so a query suffix busts the browser cache.
      auth.user.avatarUrl = `${avatarUrl}?v=${Date.now()}`;
    }
    avatarFile.value = null;
    if (avatarInput.value) avatarInput.value.value = "";
    avatarUpdated.value = true;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.fieldErrors.avatar) {
        avatarError.value = err.fieldErrors.avatar;
      } else {
        avatarBanner.value = err.message;
      }
    } else {
      avatarBanner.value = "The request failed. Try again.";
    }
  } finally {
    avatarPending.value = false;
  }
}

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const currentPasswordError = ref("");
const newPasswordError = ref("");
const confirmPasswordError = ref("");
const passwordBanner = ref("");
const passwordChanged = ref(false);
const passwordPending = ref(false);

async function onPasswordSubmit(): Promise<void> {
  if (passwordPending.value) return;
  currentPasswordError.value = "";
  newPasswordError.value = "";
  confirmPasswordError.value = "";
  passwordBanner.value = "";
  passwordChanged.value = false;
  if (newPassword.value !== confirmPassword.value) {
    confirmPasswordError.value = "The passwords do not match.";
    return;
  }
  passwordPending.value = true;
  try {
    await changePassword(currentPassword.value, newPassword.value);
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    passwordChanged.value = true;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        currentPasswordError.value = "The current password is wrong.";
      } else if (Object.keys(err.fieldErrors).length > 0) {
        currentPasswordError.value = err.fieldErrors.currentPassword ?? "";
        newPasswordError.value = err.fieldErrors.newPassword ?? "";
      } else {
        passwordBanner.value = err.message;
      }
    } else {
      passwordBanner.value = "The request failed. Try again.";
    }
  } finally {
    passwordPending.value = false;
  }
}
</script>

<template>
  <div v-if="auth.user" class="profile">
    <h1>Profile</h1>

    <section class="section" aria-labelledby="account-heading">
      <h2 id="account-heading">Account</h2>
      <div class="account-row">
        <img
          v-if="auth.user.avatarUrl"
          :src="auth.user.avatarUrl"
          alt=""
          class="avatar"
        />
        <span v-else class="avatar avatar-letter" aria-hidden="true">{{
          auth.user.username[0]
        }}</span>
        <div>
          <p class="username">{{ auth.user.username }}</p>
          <p class="muted member-since">Member since {{ memberSince }}</p>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="avatar-heading">
      <h2 id="avatar-heading">Avatar</h2>
      <form class="form" novalidate @submit.prevent="onAvatarSubmit">
        <div>
          <label class="label" for="avatar-file"
            >Image (png, jpeg or webp, up to 1 MB)</label
          >
          <input
            id="avatar-file"
            ref="avatarInput"
            class="input file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="onAvatarChange"
          />
          <p v-if="avatarError" class="error-text">{{ avatarError }}</p>
        </div>
        <p v-if="avatarBanner" class="banner" role="alert">{{ avatarBanner }}</p>
        <div class="form-row">
          <button type="submit" class="btn" :disabled="!avatarFile || avatarPending">
            Upload
          </button>
          <span v-if="avatarUpdated" class="ok confirm-text" role="status"
            >Avatar updated.</span
          >
        </div>
      </form>
    </section>

    <section class="section" aria-labelledby="password-heading">
      <h2 id="password-heading">Password</h2>
      <form class="form" novalidate @submit.prevent="onPasswordSubmit">
        <div>
          <label class="label" for="current-password">Current password</label>
          <input
            id="current-password"
            v-model="currentPassword"
            class="input"
            type="password"
            autocomplete="current-password"
          />
          <p v-if="currentPasswordError" class="error-text">
            {{ currentPasswordError }}
          </p>
        </div>
        <div>
          <label class="label" for="new-password">New password (8-128 characters)</label>
          <input
            id="new-password"
            v-model="newPassword"
            class="input"
            type="password"
            autocomplete="new-password"
          />
          <p v-if="newPasswordError" class="error-text">{{ newPasswordError }}</p>
        </div>
        <div>
          <label class="label" for="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            class="input"
            type="password"
            autocomplete="new-password"
          />
          <p v-if="confirmPasswordError" class="error-text">
            {{ confirmPasswordError }}
          </p>
        </div>
        <p v-if="passwordBanner" class="banner" role="alert">{{ passwordBanner }}</p>
        <div class="form-row">
          <button type="submit" class="btn" :disabled="passwordPending">
            Change password
          </button>
          <span v-if="passwordChanged" class="ok confirm-text" role="status"
            >Password changed.</span
          >
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
h1 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem;
}

h2 {
  font-size: 1rem;
  margin: 0 0 1rem;
}

.section {
  padding: 1.5rem 0;
}

.section + .section {
  border-top: 1px solid var(--hairline);
}

.account-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-letter {
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  text-transform: uppercase;
}

.username {
  margin: 0;
  color: var(--text-bright);
  font-size: 1.1rem;
  font-weight: 600;
}

.member-since {
  margin: 0.15rem 0 0;
  font-size: 0.9rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  max-width: 24rem;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.error-text {
  margin: 0.35rem 0 0;
}

.confirm-text {
  font-size: 0.9rem;
}

.banner {
  border: 1px solid var(--err);
  border-radius: 5px;
  color: var(--err);
  font-size: 0.9rem;
  padding: 0.5rem 0.65rem;
  margin: 0;
}

.file-input {
  padding: 0.4rem 0.5rem;
}
</style>
