import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { avatarUpload } from "../middleware/avatarUpload.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, userController.me);
usersRouter.patch("/me", requireAuth, userController.changePassword);
usersRouter.put("/me/avatar", requireAuth, avatarUpload, userController.uploadAvatar);
// no auth guard on purpose: avatars load from plain <img> tags. This route
// is the only way uploaded files are served; uploads/ has no static mount.
usersRouter.get("/:id/avatar", userController.getAvatar);
