import { defineStore } from "pinia";
import { ref } from "vue";
import * as authApi from "../api/auth";
import type { UserProfile } from "../api/auth";
import { ApiError } from "../api/client";

export const useAuthStore = defineStore("auth", /**
 * Create the shared authentication state and session actions.
 * Parameters: none.
 * @returns The user ref and actions to restore, open, register, end or clear a session.
 */
() => {
  const user = ref<UserProfile | null>(null);

  let bootstrapPromise: Promise<void> | null = null;

  /**
   * Forget the local account and cached session check.
   * Parameters: none.
   * @returns Nothing; resets user and bootstrap state.
   */
  function clearSession(): void {
    user.value = null;
    bootstrapPromise = null;
  }

  // Resolves whether logged in or not; a 401 just leaves user null.
  /**
   * Restore the current session while sharing an in-progress check.
   * Parameters: none.
   * @returns Promise that resolves without a value once the user is known; non-401 failures reject.
   */
  function bootstrap(): Promise<void> {
    if (!bootstrapPromise) {
      bootstrapPromise = authApi
        .me()
        .then(/**
         * Store the profile returned by the session check.
         * @param profile - Authenticated account profile returned by the API.
         * @returns Nothing; sets the shared current user.
         */
        (profile) => {
          user.value = profile;
        })
        .catch(/**
         * Treat a missing session as anonymous and allow other failures to be retried.
         * @param err - Failure from the session-profile request.
         * @returns Nothing for HTTP 401; rethrows other errors after clearing the cached check.
         */
        (err: unknown) => {
          if (err instanceof ApiError && err.status === 401) {
            user.value = null;
            return;
          }
          // Not caching the failure lets the next navigation retry.
          bootstrapPromise = null;
          throw err;
        });
    }
    return bootstrapPromise;
  }

  /**
   * Open a session and load the signed-in account.
   * @param username - Username supplied by the login form.
   * @param password - Password supplied by the login form.
   * @returns Promise that resolves without a value once the user state is updated.
   */
  async function login(username: string, password: string): Promise<void> {
    await authApi.login(username, password);
    user.value = await authApi.me();
  }

  /**
   * Create an account and sign it in.
   * @param username - Username for the new account.
   * @param password - Password for the new account.
   * @returns Promise that resolves without a value once registration and login finish.
   */
  async function register(username: string, password: string): Promise<void> {
    await authApi.register(username, password);
    await login(username, password);
  }

  /**
   * End the server session and clear local authentication.
   * Parameters: none.
   * @returns Promise that resolves without a value after both steps finish.
   */
  async function logout(): Promise<void> {
    await authApi.logout();
    clearSession();
  }

  return { user, bootstrap, login, register, logout, clearSession };
});
