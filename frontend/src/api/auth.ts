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

export function register(
  username: string,
  password: string,
): Promise<AuthUser> {
  return apiPost<AuthUser>("/api/auth/register", { username, password });
}

export function login(username: string, password: string): Promise<AuthUser> {
  return apiPost<AuthUser>("/api/auth/login", { username, password });
}

export function logout(): Promise<void> {
  return apiPost<void>("/api/auth/logout");
}

export function me(): Promise<UserProfile> {
  return apiGet<UserProfile>("/api/auth/me");
}
