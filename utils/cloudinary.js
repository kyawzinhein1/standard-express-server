import { v2 as cloudinary } from "cloudinary";

// Configuration
cloudinary.config({
    cloud_name: "dqbdrgott",
    api_key: "421514785878452",
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadFileToCloudinary = async (filePath) => {
    try {
        if (!filePath) return null;
        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
        });
        console.log("File upload complete", response.url);
    } catch (error) {
        console.log(error);
        return null;
    }
};
