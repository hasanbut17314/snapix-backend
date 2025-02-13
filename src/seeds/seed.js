import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sampleProfiles = [
    "https://picsum.photos/200/200",
    "https://picsum.photos/200/200",
    "https://picsum.photos/200/200",
    "https://picsum.photos/200/200",
    "https://picsum.photos/200/200"
];

const samplePostImages = [
    "https://picsum.photos/800/600",
    "https://picsum.photos/800/600",
    "https://picsum.photos/800/600",
    "https://picsum.photos/800/600",
    "https://picsum.photos/800/600"
];

async function downloadImage(url, filepath) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(filepath, buffer);
        return filepath;
    } catch (error) {
        console.error("Error downloading image:", error);
        return null;
    }
}

async function uploadImage(filepath) {
    try {
        if (!filepath) return null;
        const uploadedFile = await uploadOnCloudinary(filepath);
        if (!uploadedFile || !uploadedFile.url) {
            throw new Error("Failed to upload to Cloudinary");
        }
        return uploadedFile;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return null;
    } finally {
        // Clean up temp file if it exists
        if (filepath && fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
}

async function seedDatabase() {
    try {
        // Clear existing data
        // await User.deleteMany({});
        // await Post.deleteMany({});
        // await Comment.deleteMany({});

        console.log("Creating users...");
        const users = [];
        for (let i = 0; i < 5; i++) {
            try {
                const tempPath = path.join(__dirname, `temp_profile_${i}.jpg`);
                const downloadedPath = await downloadImage(sampleProfiles[i], tempPath);
                let profilePic = "";

                if (downloadedPath) {
                    const uploadedProfile = await uploadImage(downloadedPath);
                    if (uploadedProfile) {
                        profilePic = uploadedProfile.url;
                    }
                }

                const user = await User.create({
                    username: `user${i}`,
                    email: `user${i}@example.com`,
                    password: "password123",
                    profilePic,
                    bio: `Bio for user ${i}`,
                    isPrivate: i === 0
                });
                users.push(user);
                console.log(`Created user: ${user.username}`);
            } catch (error) {
                console.error(`Error creating user ${i}:`, error);
            }
        }

        console.log("Creating follow relationships...");
        for (let i = 0; i < users.length; i++) {
            for (let j = 0; j < users.length; j++) {
                if (i !== j && Math.random() > 0.5) {
                    users[i].following.push(users[j]._id);
                    users[j].followers.push(users[i]._id);
                    await users[i].save();
                    await users[j].save();
                }
            }
        }

        console.log("Creating posts...");
        const posts = [];
        for (let i = 0; i < 20; i++) {
            try {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const hasMedia = Math.random() > 0.3;

                let mediaUrl = "";
                let mediaType = "none";

                if (hasMedia) {
                    const tempPath = path.join(__dirname, `temp_post_${i}.jpg`);
                    const randomImage = samplePostImages[Math.floor(Math.random() * samplePostImages.length)];
                    const downloadedPath = await downloadImage(randomImage, tempPath);

                    if (downloadedPath) {
                        const uploadedMedia = await uploadImage(downloadedPath);
                        if (uploadedMedia) {
                            mediaUrl = uploadedMedia.url;
                            mediaType = "image";
                        }
                    }
                }

                const post = await Post.create({
                    owner: randomUser._id,
                    title: `Post ${i} by ${randomUser.username}`,
                    description: `This is a sample post ${i}`,
                    content: hasMedia ? "" : `This is a text-only post ${i} with some content.`,
                    mediaUrl,
                    mediaType,
                    tags: [`tag${i}`, "sample", randomUser.username],
                    visibility: Math.random() > 0.8 ? "private" : "public"
                });
                posts.push(post);
                console.log(`Created post: ${post.title}`);
            } catch (error) {
                console.error(`Error creating post ${i}:`, error);
            }
        }

        console.log("Adding comments and likes...");
        for (const post of posts) {
            try {
                const likeCount = Math.floor(Math.random() * users.length);
                const shuffledUsers = users.sort(() => 0.5 - Math.random());
                post.likes = shuffledUsers.slice(0, likeCount).map(user => user._id);

                const commentCount = Math.floor(Math.random() * 5);
                for (let i = 0; i < commentCount; i++) {
                    const randomUser = users[Math.floor(Math.random() * users.length)];
                    const comment = await Comment.create({
                        owner: randomUser._id,
                        post: post._id,
                        content: `Comment ${i} on post by ${randomUser.username}`,
                        likes: Math.floor(Math.random() * 10)
                    });
                    post.comments.push(comment._id);
                }

                await post.save();
            } catch (error) {
                console.error(`Error processing post ${post._id}:`, error);
            }
        }

        console.log("Database seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

// Connect to MongoDB
mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    .then(() => {
        console.log("Connected to MongoDB");
        seedDatabase();
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });