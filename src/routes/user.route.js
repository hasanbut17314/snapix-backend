import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserProfilePic,
    toggleFollow,
    handleFollowRequest,
    togglePrivateAccount,
    getFollowLists,
    getSuggestedUsers
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refreshToken", refreshAccessToken);
router.get("/getCurrentUser", verifyJWT, getCurrentUser);
router.put("/changePassword", verifyJWT, changeCurrentPassword);
router.put("/updateUser", verifyJWT, updateAccountDetails);
router.put("/updateProfilePic", verifyJWT, upload.single("profilePic"), updateUserProfilePic);

router.post("/toggleFollow/:userId", verifyJWT, toggleFollow);
router.post("/followRequest/:userId", verifyJWT, handleFollowRequest);
router.post("/togglePrivate", verifyJWT, togglePrivateAccount);
router.get("/followList/:userId", getFollowLists);
router.get("/suggestedUsers", verifyJWT, getSuggestedUsers);

export default router