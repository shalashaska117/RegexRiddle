import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ValidationError } from "../errors.js";

// In-memory storage: the controller checks the magic bytes before anything
// reaches disk, and the 1 MB cap keeps the buffering bounded.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1 },
});

const single = upload.single("avatar");

// Multer reports the size cap and stray file fields as errors; translate
// them into the standard 422 shape instead of letting them become a 500.
export function avatarUpload(req: Request, res: Response, next: NextFunction): void {
  single(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE" ? "the image must be 1 MB or smaller" : err.message;
      next(new ValidationError({ avatar: message }));
      return;
    }
    next(err);
  });
}
