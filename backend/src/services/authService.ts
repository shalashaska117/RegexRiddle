import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { AppError } from "../errors.js";

export interface PublicUser {
  id: number;
  username: string;
}

// explicit select so passwordHash never reaches a controller
const publicUserSelect = { id: true, username: true } as const;

/**
 * Creates an account with a hashed password.
 * @param username - Unique username for the account.
 * @param password - Plain-text password to hash before storage.
 * @returns A promise for the new user ID and username.
 */
export async function register(username: string, password: string): Promise<PublicUser> {
  // argon2id by default, per docs/security.md
  const passwordHash = await argon2.hash(password);
  try {
    return await prisma.user.create({
      data: { username, passwordHash },
      select: publicUserSelect,
    });
  } catch (error) {
    // P2002: unique constraint violation, here only possible on username
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Username already taken");
    }
    throw error;
  }
}

/**
 * Checks a username and password against the stored account.
 * @param username - Username used to find the account.
 * @param password - Plain-text password to verify.
 * @returns A promise for the user ID and username; rejects invalid credentials.
 */
export async function verifyCredentials(username: string, password: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, passwordHash: true },
  });
  // same message for unknown user and wrong password, so usernames cannot
  // be probed through the login endpoint
  if (user === null || !(await argon2.verify(user.passwordHash, password))) {
    throw new AppError(401, "Invalid username or password");
  }
  return { id: user.id, username: user.username };
}
