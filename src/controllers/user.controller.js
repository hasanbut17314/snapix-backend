import asyncHandler from "../utils/asyncHandler.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body

    if ([username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    let profilePicLocalPath;
    if (req.file) {
        profilePicLocalPath = req.file.path
    }

    let profilePic = "";
    if (profilePicLocalPath) {
        const response = await uploadOnCloudinary(profilePicLocalPath)
        if (response) {
            profilePic = response.url
        }
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        profilePic
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {

    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req?.cookies?.refreshToken || req?.body?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { username, email } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                username,
                email
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserProfilePic = asyncHandler(async (req, res) => {
    const profilePicLocalPath = req.file?.path

    if (!profilePicLocalPath) {
        throw new ApiError(400, "Profile pic file is missing")
    }

    const user = await User.findById(req.user?._id)
    if (user.profilePic) {
        const oldPublicId = user.profilePic.split('/').pop().split('.')[0]
        await deleteFromCloudinary(oldPublicId, user.profilePic)
    }

    const response = await uploadOnCloudinary(profilePicLocalPath)

    if (!response) {
        throw new ApiError(400, "Error while uploading profile pic")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                profilePic: response.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile pic updated successfully"))
})

const toggleFollow = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const userToFollow = await User.findById(userId);

    if (!userToFollow) {
        throw new ApiError(404, "User not found");
    }

    if (userToFollow._id.toString() === req.user._id.toString()) {
        throw new ApiError(400, "You cannot follow yourself");
    }

    if (userToFollow.isPrivate) {
        if (userToFollow.followers.includes(req.user._id)) {
            userToFollow.followers.pull(req.user._id);
            req.user.following.pull(userToFollow._id);
            await userToFollow.save();
            await req.user.save();
            return res.status(200).json(
                new ApiResponse(200, {}, "User unfollowed successfully")
            );
        }

        if (userToFollow.followRequests.includes(req.user._id)) {
            userToFollow.followRequests.pull(req.user._id);
            await userToFollow.save();
            return res.status(200).json(
                new ApiResponse(200, {}, "Follow request cancelled")
            );
        }

        userToFollow.followRequests.push(req.user._id);
        await userToFollow.save();
        return res.status(200).json(
            new ApiResponse(200, {}, "Follow request sent")
        );
    }

    const isFollowing = userToFollow.followers.includes(req.user._id);

    if (isFollowing) {
        userToFollow.followers.pull(req.user._id);
        req.user.following.pull(userToFollow._id);
    } else {
        userToFollow.followers.push(req.user._id);
        req.user.following.push(userToFollow._id);
    }

    await userToFollow.save();
    await req.user.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            { following: !isFollowing },
            isFollowing ? "User unfollowed successfully" : "User followed successfully"
        )
    );
});

const handleFollowRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { accept = false } = req.body;

    const userToHandle = await User.findById(userId);

    if (!userToHandle) {
        throw new ApiError(404, "User not found");
    }

    if (!req.user.isPrivate) {
        throw new ApiError(400, "Only private accounts can accept/reject follow requests");
    }

    if (!req.user.followRequests.includes(userToHandle._id)) {
        throw new ApiError(400, "No follow request from this user");
    }

    req.user.followRequests.pull(userToHandle._id);

    if (accept === true) {
        req.user.followers.push(userToHandle._id);
        userToHandle.following.push(req.user._id);
        await userToHandle.save();
    }

    await req.user.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            accept ? "Follow request accepted" : "Follow request rejected"
        )
    );
});

const togglePrivateAccount = asyncHandler(async (req, res) => {
    req.user.isPrivate = !req.user.isPrivate;
    await req.user.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            { isPrivate: req.user.isPrivate },
            `Account is now ${req.user.isPrivate ? 'private' : 'public'}`
        )
    );
});

const getFollowLists = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    const {
        type = "followers",
        page = 1,
        limit = 10,
        search = ""
    } = req.query;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    let userIds = type === "followers" ? user.followers : user.following;

    const query = {
        _id: { $in: userIds }
    };

    if (search) {
        query.username = { $regex: search, $options: "i" };
    }

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        select: "username profilePic bio",
        sort: { username: 1 }
    };

    const users = await User.paginate(query, options);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    users: users.docs,
                    totalUsers: users.totalDocs,
                    totalPages: users.totalPages
                },
                `${type} list fetched successfully`
            )
        );
});

const getSuggestedUsers = asyncHandler(async (req, res) => {
    const followingIds = req.user.following;
    followingIds.push(req.user._id);

    const suggestedUsers = await User.find({
        _id: { $nin: followingIds },
        isPrivate: false
    })
        .select("username profilePic")
        .limit(10);

    return res.status(200).json(
        new ApiResponse(200, suggestedUsers, "Suggested users fetched successfully")
    );
});

export {
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
}