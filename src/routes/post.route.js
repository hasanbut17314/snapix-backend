import { Router } from "express";
import {
    createPost,
    getPosts,
    getUserFeed,
    getPost,
    updatePost,
    deletePost,
    togglePostLike,
    addComment,
    deleteComment,
    updateComment
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.get("/getPosts", getPosts);
router.get("/getPost/:postId", getPost);

router.use(verifyJWT);
// Protected routes
router.post("/createPost", upload.single("media"), createPost);
router.get("/userFeed", getUserFeed);
router.put("/updatePost/:postId", upload.single("media"), updatePost);
router.delete("/deletePost/:postId", deletePost);
router.post("/toggleLike/:postId", togglePostLike);
// Comment routes
router.post("/addComment/:postId", addComment);
router.put("/:postId/updateComment/:commentId", updateComment);
router.delete("/:postId/deleteComment/:commentId", deleteComment);

export default router;