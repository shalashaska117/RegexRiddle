import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import { prisma } from "../db.js";
import { AppError } from "../errors.js";

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

// The API never exposes avatarPath, only this URL (or null while the user
// has no avatar).
export function avatarUrl(userId: number, avatarPath: string | null): string | null {
  return avatarPath === null ? null : `/api/users/${userId}/avatar`;
}

export async function getProfile(userId: number): Promise<Profile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatarPath: true, createdAt: true },
  });
  if (user === null) {
    // the session outlived the account
    throw new AppError(401, "Authentication required");
  }
  return {
    id: user.id,
    username: user.username,
    avatarUrl: avatarUrl(user.id, user.avatarPath),
    createdAt: user.createdAt,
  };
}

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
    throw new AppError(401, "Authentication required");
  }
  if (!(await argon2.verify(user.passwordHash, currentPassword))) {
    throw new AppError(401, "Current password is incorrect");
  }
  const passwordHash = await argon2.hash(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

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
    throw new AppError(401, "Authentication required");
  }

  // server-generated name; the client's filename never touches the filesystem
  const filename = `${crypto.randomUUID()}${extension}`;
  await fs.mkdir(avatarsDir, { recursive: true });
  await fs.writeFile(path.join(avatarsDir, filename), data);
  await prisma.user.update({ where: { id: userId }, data: { avatarPath: filename } });

  if (user.avatarPath !== null) {
    // best-effort cleanup: an old file that is already gone must not fail
    // the upload that replaced it
    await fs.unlink(path.join(avatarsDir, path.basename(user.avatarPath))).catch(() => {});
  }

  return { avatarUrl: `/api/users/${userId}/avatar` };
}

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
