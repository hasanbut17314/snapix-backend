import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserProfilePic
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.get("/refreshToken", refreshAccessToken);
router.get("/getCurrentUser", verifyJWT, getCurrentUser);
router.put("/changePassword", verifyJWT, changeCurrentPassword);
router.put("/updateUser", verifyJWT, updateAccountDetails);
router.put("/updateProfilePic", verifyJWT, upload.single("profilePic"), updateUserProfilePic);

export default router