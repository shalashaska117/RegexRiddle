import { apiGet, apiPatch, apiPutMultipart } from "./client";
import type { UserProfile } from "./auth";

export type { UserProfile };

export function getProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>("/api/users/me");
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return apiPatch<void>("/api/users/me", { currentPassword, newPassword });
}

export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append("avatar", file);
  return apiPutMultipart<{ avatarUrl: string }>("/api/users/me/avatar", form);
}
