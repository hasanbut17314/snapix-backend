import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const postSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    content: {
        type: String,  // For text-only posts
        trim: true
    },
    mediaType: {
        type: String,
        enum: ["image", "video", "none"],
        default: "none"
    },
    mediaUrl: {
        type: String
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    comments: [{
        type: Schema.Types.ObjectId,
        ref: "Comment"
    }],
    tags: [{
        type: String,
        trim: true
    }],
    visibility: {
        type: String,
        enum: ["public", "private", "followers"],
        default: "public"
    }
}, {
    timestamps: true
});

postSchema.plugin(mongoosePaginate);

postSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Post = mongoose.model("Post", postSchema);