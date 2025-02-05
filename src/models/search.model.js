import mongoose, { Schema } from "mongoose";

const searchSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    searchQuery: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ["posts", "users", "tags"],
        default: "posts"
    },
    frequency: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

searchSchema.index({ user: 1, searchQuery: 1 }, { unique: true });

export const Search = mongoose.model("Search", searchSchema);