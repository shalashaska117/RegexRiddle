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

/**
 * Reads one avatar upload and passes upload errors to the error handler.
 * @param req - Multipart request that receives the parsed file.
 * @param res - Response passed to the upload parser.
 * @param next - Continues the request or forwards an error.
 * @returns No value; starts parsing the upload.
 */
export function avatarUpload(req: Request, res: Response, next: NextFunction): void {
  single(req, res,
    /**
     * Converts upload limits into field validation errors.
     * @param err - Upload parser error, or no error on success.
     * @returns No value; passes a validation error or the original result to next.
     */
    (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE" ? "the image must be 1 MB or smaller" : err.message;
        next(new ValidationError({ avatar: message }));
        return;
      }
      next(err);
    });
}
