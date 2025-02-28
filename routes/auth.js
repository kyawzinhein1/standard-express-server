import { Router } from "express";
import {
  registerController,
  loginController,
  generateNewRefreshToken,
  logoutController,
  changePasswordController,
  changeUsernameController,
} from "../controllers/authController.js";
import { upload } from "../middlewares/multerStorage.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = Router();

router.post(
  "/register",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "cover_photo", maxCount: 1 },
  ]),
  registerController
);

router.post("/login", loginController);

router.post("/refresh", generateNewRefreshToken);

router.post("/logout", verifyJWT, logoutController);

router.post("/change-password", verifyJWT, changePasswordController);

router.post("/change-username", verifyJWT, changeUsernameController);

export default router;
