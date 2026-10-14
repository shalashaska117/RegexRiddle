import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import { prisma } from "../db.js";
import { AppError, AuthenticationRequiredError } from "../errors.js";

// Avatars live outside the web root and are served only through
// GET /api/users/:id/avatar (docs/security.md). The directory is resolved
// relative to this module, which sits at the same depth in src/ under tsx
// and in dist/ after tsc.
const avatarsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/avatars",
);

const contentTypeByExtension: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

export interface Profile {
  id: number;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
}

/**
 * Builds the public URL for a stored avatar.
 * @param userId - User who owns the avatar.
 * @param avatarPath - Stored filename, or null when no avatar exists.
 * @returns The user's avatar URL, or null when no file is stored.
 */
export function avatarUrl(userId: number, avatarPath: string | null): string | null {
  return avatarPath === null ? null : `/api/users/${userId}/avatar`;
}

/**
 * Loads a user's public profile.
 * @param userId - User whose profile is requested.
 * @returns A promise for ID, username, avatar URL and account creation time.
 */
export async function getProfile(userId: number): Promise<Profile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatarPath: true, createdAt: true },
  });
  if (user === null) {
    // the session outlived the account
    throw new AuthenticationRequiredError();
  }
  return {
    id: user.id,
    username: user.username,
    avatarUrl: avatarUrl(user.id, user.avatarPath),
    createdAt: user.createdAt,
  };
}

/**
 * Replaces a password after checking the current one.
 * @param userId - Account whose password is changed.
 * @param currentPassword - Plain-text password used to verify ownership.
 * @param newPassword - Plain-text replacement to hash and store.
 * @returns A promise that resolves with no value after saving the new hash.
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (user === null) {
    throw new AuthenticationRequiredError();
  }
  if (!(await argon2.verify(user.passwordHash, currentPassword))) {
    throw new AppError(401, "Current password is incorrect");
  }
  const passwordHash = await argon2.hash(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/**
 * Stores a new avatar and removes the previous file when possible.
 * @param userId - Account that receives the avatar.
 * @param data - Validated image bytes to save.
 * @param extension - Accepted file extension for the image.
 * @returns A promise for an object whose avatarUrl points to the saved image.
 */
export async function updateAvatar(
  userId: number,
  data: Buffer,
  extension: string,
): Promise<{ avatarUrl: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarPath: true },
  });
  if (user === null) {
    throw new AuthenticationRequiredError();
  }

  // server-generated name; the client's filename never touches the filesystem
  const filename = `${crypto.randomUUID()}${extension}`;
  await fs.mkdir(avatarsDir, { recursive: true });
  await fs.writeFile(path.join(avatarsDir, filename), data);
  await prisma.user.update({ where: { id: userId }, data: { avatarPath: filename } });

  if (user.avatarPath !== null) {
    // best-effort cleanup: an old file that is already gone must not fail
    // the upload that replaced it
    await fs.unlink(path.join(avatarsDir, path.basename(user.avatarPath))).catch(
      /**
       * Ignores failure to remove a previous avatar.
       * Parameters: none.
       * @returns No value; allows the completed upload to succeed.
       */
      () => {});
  }

  return { avatarUrl: `/api/users/${userId}/avatar` };
}

/**
 * Finds the stored avatar file and its content type.
 * @param userId - User whose avatar is requested.
 * @returns A promise for absolutePath, the file to send, and contentType, its MIME type.
 */
export async function getAvatarFile(
  userId: number,
): Promise<{ absolutePath: string; contentType: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarPath: true },
  });
  if (user === null || user.avatarPath === null) {
    throw new AppError(404, "Avatar not found");
  }
  // basename strips any path components, so even a corrupted avatarPath
  // cannot point outside the avatars directory
  const filename = path.basename(user.avatarPath);
  const absolutePath = path.join(avatarsDir, filename);
  const contentType = contentTypeByExtension[path.extname(filename)];
  if (contentType === undefined) {
    throw new AppError(404, "Avatar not found");
  }
  try {
    await fs.access(absolutePath);
  } catch {
    // the row points at a file that is gone from disk
    throw new AppError(404, "Avatar not found");
  }
  return { absolutePath, contentType };
}
