import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Post } from "../models/post.model.js";
import { Search } from "../models/search.model.js";
import { Comment } from "../models/comment.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const createPost = asyncHandler(async (req, res) => {
    const { title, description, content, tags, visibility } = req.body;

    if (!title) {
        throw new ApiError(400, "Title is required");
    }

    let mediaUrl = "";
    let mediaType = "none";

    if (req.file) {
        const mediaLocalPath = req.file.path;
        const uploadedMedia = await uploadOnCloudinary(mediaLocalPath);

        if (!uploadedMedia) {
            throw new ApiError(400, "Error while uploading media");
        }

        mediaUrl = uploadedMedia.url;
        mediaType = uploadedMedia.resource_type === "video" ? "video" : "image";
    }

    const post = await Post.create({
        title,
        description,
        content,
        mediaUrl,
        mediaType,
        owner: req.user._id,
        tags: tags ? JSON.parse(tags) : [],
        visibility,
        likes: [],
        comments: []
    });

    const createdPost = await Post.findById(post._id)
        .populate("owner", "username profilePic")
        .populate({
            path: "comments",
            populate: {
                path: "owner",
                select: "username profilePic"
            }
        });

    if (!createdPost) {
        throw new ApiError(500, "Something went wrong while creating post");
    }

    return res.status(201).json(
        new ApiResponse(201, createdPost, "Post created successfully")
    );
});

const getPosts = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search = "",
        tags,
        mediaType
    } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 },
        populate: [
            {
                path: "owner",
                select: "username profilePic"
            },
            {
                path: "comments",
                populate: {
                    path: "owner",
                    select: "username profilePic"
                }
            },
            {
                path: "likes",
                select: "username profilePic"
            }
        ]
    };

    const query = {
        visibility: "public"
    };

    if (search) {
        query.$text = { $search: search };
        // Store search query if user is logged in
        if (req.user) {
            await Search.findOneAndUpdate(
                { user: req.user._id, searchQuery: search, category: "posts" },
                { $inc: { frequency: 1 } },
                { upsert: true }
            );
        }
    }

    if (tags) {
        query.tags = { $in: tags.split(",") };
    }

    if (mediaType) {
        query.mediaType = mediaType;
    }

    const posts = await Post.paginate(query, options);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    posts: posts.docs,
                    totalPosts: posts.totalDocs,
                    totalPages: posts.totalPages
                },
                "Posts fetched successfully"
            )
        );
});

const getUserFeed = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const searchHistory = await Search.find({ user: req.user._id })
        .sort("-frequency")
        .limit(5);

    const searchTerms = searchHistory.map(search => search.searchQuery).join(" ");

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            {
                path: "owner",
                select: "username profilePic"
            },
            {
                path: "comments",
                populate: {
                    path: "owner",
                    select: "username profilePic"
                }
            },
            {
                path: "likes",
                select: "username profilePic"
            }
        ]
    };

    const query = {
        visibility: "public"
    };

    if (searchTerms) {
        query.$text = { $search: searchTerms };
    }

    const posts = await Post.paginate(query, options);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    posts: posts.docs,
                    totalPosts: posts.totalDocs,
                    totalPages: posts.totalPages
                },
                "Feed fetched successfully"
            )
        );
});

const getPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId)
        .populate("owner", "username profilePic")
        .populate({
            path: "comments",
            populate: {
                path: "owner",
                select: "username profilePic"
            }
        })
        .populate("likes", "username profilePic");

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.visibility !== "public" &&
        post.owner._id.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You don't have permission to view this post");
    }

    return res.status(200).json(
        new ApiResponse(200, post, "Post fetched successfully")
    );
});

const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { title, description, content, tags, visibility } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to update this post");
    }

    let mediaUrl = post.mediaUrl;
    let mediaType = post.mediaType;

    if (req.file) {

        if (post.mediaUrl) {
            const oldPublicId = post.mediaUrl.split('/').pop().split('.')[0];
            await deleteFromCloudinary(oldPublicId, post.mediaUrl);
        }

        const mediaLocalPath = req.file.path;
        const uploadedMedia = await uploadOnCloudinary(mediaLocalPath);

        if (!uploadedMedia) {
            throw new ApiError(400, "Error while uploading media");
        }

        mediaUrl = uploadedMedia.url;
        mediaType = uploadedMedia.resource_type === "video" ? "video" : "image";
    }

    post.title = title || post.title;
    post.description = description || post.description;
    post.content = content || post.content;
    post.tags = tags ? JSON.parse(tags) : post.tags;
    post.visibility = visibility || post.visibility;
    post.mediaUrl = mediaUrl;
    post.mediaType = mediaType;

    await post.save();

    const updatedPost = await Post.findById(postId)
        .populate("owner", "username profilePic")
        .populate({
            path: "comments",
            populate: {
                path: "owner",
                select: "username profilePic"
            }
        })
        .populate("likes", "username profilePic");

    return res.status(200).json(
        new ApiResponse(200, updatedPost, "Post updated successfully")
    );
});

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to delete this post");
    }

    if (post.mediaUrl) {
        const publicId = post.mediaUrl.split('/').pop().split('.')[0];
        await deleteFromCloudinary(publicId, post.mediaUrl);
    }

    await Comment.deleteMany({ post: postId });
    await Post.findByIdAndDelete(postId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Post deleted successfully")
    );
});

const togglePostLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const userLikedIndex = post.likes.indexOf(req.user._id);

    if (userLikedIndex === -1) {
        post.likes.push(req.user._id);
    } else {
        post.likes.splice(userLikedIndex, 1);
    }

    await post.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { liked: userLikedIndex === -1 },
                userLikedIndex === -1 ? "Post liked successfully" : "Post unliked successfully"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Comment content is required");
    }

    const post = await Post.findById(postId);

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const comment = await Comment.create({
        content,
        owner: req.user._id,
        post: postId
    });

    post.comments.push(comment._id);
    await post.save();

    const populatedComment = await Comment.findById(comment._id)
        .populate("owner", "username profilePic");

    return res.status(201).json(
        new ApiResponse(201, populatedComment, "Comment added successfully")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { postId, commentId } = req.params;

    const comment = await Comment.findById(commentId);
    const post = await Post.findById(postId);

    if (!comment || !post) {
        throw new ApiError(404, "Comment or Post not found");
    }

    if (comment.owner.toString() !== req.user._id.toString() &&
        post.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to delete this comment");
    }

    post.comments = post.comments.filter(
        id => id.toString() !== commentId.toString()
    );
    await post.save();

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    );
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Comment content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to update this comment");
    }

    comment.content = content;
    await comment.save();

    const updatedComment = await Comment.findById(commentId)
        .populate("owner", "username profilePic");

    return res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    );
});

export {
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
};