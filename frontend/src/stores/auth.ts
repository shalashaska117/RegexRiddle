import { defineStore } from "pinia";
import { ref } from "vue";
import * as authApi from "../api/auth";
import type { UserProfile } from "../api/auth";
import { ApiError } from "../api/client";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<UserProfile | null>(null);

  let bootstrapPromise: Promise<void> | null = null;

  // Resolves whether logged in or not; a 401 just leaves user null.
  function bootstrap(): Promise<void> {
    if (!bootstrapPromise) {
      bootstrapPromise = authApi
        .me()
        .then((profile) => {
          user.value = profile;
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status === 401) return;
          // Not caching the failure lets the next navigation retry.
          bootstrapPromise = null;
          throw err;
        });
    }
    return bootstrapPromise;
  }

  async function login(username: string, password: string): Promise<void> {
    await authApi.login(username, password);
    user.value = await authApi.me();
  }

  async function register(username: string, password: string): Promise<void> {
    await authApi.register(username, password);
    await login(username, password);
  }

  async function logout(): Promise<void> {
    await authApi.logout();
    user.value = null;
  }

  return { user, bootstrap, login, register, logout };
});
