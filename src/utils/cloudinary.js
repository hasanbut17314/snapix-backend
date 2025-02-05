import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const deleteFromCloudinary = async (publicId, url) => {
    try {
        // First try as raw file
        try {
            const rawResponse = await cloudinary.uploader.destroy(publicId, {
                resource_type: 'raw'
            });
            if (rawResponse.result === 'ok') {
                return rawResponse;
            }
        } catch (rawError) {
            // If raw deletion fails, try as image
            console.log("Raw deletion failed, trying as image");
        }

        // Try as image if raw failed
        const imageResponse = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image'
        });
        return imageResponse;

    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error.message);
        console.error("Public ID:", publicId);
        console.error("URL:", url);
        return null;
    }
};

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export { uploadOnCloudinary, deleteFromCloudinary }