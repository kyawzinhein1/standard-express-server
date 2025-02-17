import { uploadFileToCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

export const registerController = async (req, res) => {
    let profile_photo = "";
    let cover_photo = "";

    const profile_photo_path = req.files.profile_photo[0].path;
    const cover_photo_path = req.files.cover_photo[0].path;

    if (profile_photo_path && cover_photo_path) {
        try {
            profile_photo = await uploadFileToCloudinary(profile_photo_path);
            cover_photo = await uploadFileToCloudinary(cover_photo_path);
            console.log("Cloudinary response", profile_photo, cover_photo);
        } catch (error) {
            console.log(error);
            fs.unlinkSync(profile_photo_path);
            fs.unlinkSync(cover_photo_path);
        }
    }
};
