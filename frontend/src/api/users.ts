import { apiGet, apiPatch, apiPutMultipart } from "./client";
import type { UserProfile } from "./auth";

export type { UserProfile };

/**
 * Fetch the signed-in player's profile.
 * Parameters: none.
 * @returns Promise of the account ID, username, avatar URL and creation date.
 */
export function getProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>("/api/users/me");
}

/**
 * Replace the current password after server verification.
 * @param currentPassword - Existing password used to authorize the change.
 * @param newPassword - Replacement password to validate and store.
 * @returns Promise that resolves without a value once the password is changed.
 */
export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return apiPatch<void>("/api/users/me", { currentPassword, newPassword });
}

/**
 * Upload a replacement avatar image.
 * @param file - Image file selected by the player.
 * @returns Promise of an object whose avatarUrl points to the saved image.
 */
export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append("avatar", file);
  return apiPutMultipart<{ avatarUrl: string }>("/api/users/me/avatar", form);
}
