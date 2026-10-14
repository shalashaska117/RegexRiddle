import { apiGet, apiPost } from "./client";

export interface AuthUser {
  id: number;
  username: string;
}

export interface UserProfile {
  id: number;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

/**
 * Create an account without opening a session.
 * @param username - Username to register.
 * @param password - Password to store after server validation and hashing.
 * @returns Promise of the new account ID and username.
 */
export function register(
  username: string,
  password: string,
): Promise<AuthUser> {
  return apiPost<AuthUser>("/api/auth/register", { username, password });
}

/**
 * Open a session with the supplied credentials.
 * @param username - Registered username.
 * @param password - Password to verify.
 * @returns Promise of the authenticated account ID and username.
 */
export function login(username: string, password: string): Promise<AuthUser> {
  return apiPost<AuthUser>("/api/auth/login", { username, password });
}

/**
 * End the current server session.
 * Parameters: none.
 * @returns Promise that resolves without a value once logout finishes.
 */
export function logout(): Promise<void> {
  return apiPost<void>("/api/auth/logout");
}

/**
 * Read the account attached to the current session.
 * Parameters: none.
 * @returns Promise of the account ID, username, avatar URL and creation date.
 */
export function me(): Promise<UserProfile> {
  return apiGet<UserProfile>("/api/auth/me");
}
