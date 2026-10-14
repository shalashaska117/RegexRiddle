import type { Request, Response } from "express";
import { z } from "zod";
import {
  idParamShape,
  parseBody,
  parseParams,
  passwordSchema,
} from "../middleware/validate.js";
import { sessionUserId } from "../middleware/requireAuth.js";
import { ValidationError } from "../errors.js";
import * as userService from "../services/userService.js";

const changePasswordShape = {
  // shape check only, like login: a wrong current password answers 401
  // from the service, not 422
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
};

// extension the stored file gets for each accepted content type
const extensionByType: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

/**
 * Identifies an accepted image type from its leading bytes.
 * @param data - Uploaded bytes to inspect.
 * @returns The PNG, JPEG or WebP MIME type, or null for other bytes.
 */
function sniffImageType(data: Buffer): string | null {
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString("latin1") === "RIFF" &&
    data.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Sends the current user's profile.
 * @param req - Request with the current session.
 * @param res - Response used to send the public profile.
 * @returns A promise that resolves with no value after sending the profile.
 */
export async function me(req: Request, res: Response): Promise<void> {
  res.json(await userService.getProfile(sessionUserId(req)));
}

/**
 * Changes the current user's password.
 * @param req - Request with the session, current password and new password.
 * @param res - Response used to send status 204 after the change.
 * @returns A promise that resolves with no value after changing the password.
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = parseBody(req, changePasswordShape);
  await userService.changePassword(sessionUserId(req), currentPassword, newPassword);
  res.status(204).end();
}

/**
 * Validates and saves the current user's avatar.
 * @param req - Request with the session and uploaded image.
 * @param res - Response used to send the saved avatar URL.
 * @returns A promise that resolves with no value after sending the avatar URL.
 */
export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  // the form carries no text fields; reject strays, matching the strict
  // JSON bodies everywhere else
  z.strictObject({}).parse(req.body ?? {});
  const file = req.file;
  if (file === undefined) {
    throw new ValidationError({ avatar: "an image file is required in the avatar field" });
  }
  const extension = extensionByType[file.mimetype];
  // the declared type and the actual bytes must agree on an accepted
  // format; a mismatch means a mislabeled or disguised file
  if (extension === undefined || sniffImageType(file.buffer) !== file.mimetype) {
    throw new ValidationError({ avatar: "only png, jpeg and webp images are accepted" });
  }
  res.json(await userService.updateAvatar(sessionUserId(req), file.buffer, extension));
}

/**
 * Sends a user's stored avatar file.
 * @param req - Request with the avatar owner's ID.
 * @param res - Response used to send the image and its content type.
 * @returns A promise that resolves with no value after sending the file.
 */
export async function getAvatar(req: Request, res: Response): Promise<void> {
  const { id } = parseParams(req, idParamShape);
  const { absolutePath, contentType } = await userService.getAvatarFile(id);
  await new Promise<void>(
    /**
     * Starts sending the avatar with its content type.
     * @param resolve - Completes the promise when the file is sent.
     * @param reject - Fails the promise if sending fails.
     * @returns No value; starts the file response.
     */
    (resolve, reject) => {
      res.sendFile(absolutePath, { headers: { "Content-Type": contentType } },
        /**
         * Completes the avatar response promise.
         * @param err - File response error, or no error on success.
         * @returns No value; rejects on error or resolves on success.
         */
        (err) =>
          err ? reject(err) : resolve(),
      );
    });
}
