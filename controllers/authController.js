import { User } from "../models/user.js";
import { uploadFileToCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import jwt from "jsonwebtoken";

export const registerController = async (req, res) => {
    const { username, email, password } = req.body;

    if ([username, email, password].some((field) => field?.trim() === "")) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const profile_photo_path = req.files.profile_photo[0].path;
    const cover_photo_path = req.files.cover_photo[0].path;

    try {
        const existingUser = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (existingUser) {
            res.status(409).json({ message: "Email or Username already exist." });
            throw new Error("Email or username is already exist.");
        }

        let profile_photo = "";
        let cover_photo = "";

        if (profile_photo_path && cover_photo_path) {
            profile_photo = await uploadFileToCloudinary(profile_photo_path);
            cover_photo = await uploadFileToCloudinary(cover_photo_path);
        }

        const user = await User.create({
            email,
            username,
            password,
            profile_photo,
            cover_photo,
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refresh_token"
        );

        if (!createdUser) {
            return res
                .status(500)
                .json({ message: "Something went wrong in registration new user." });
        }
        return res
            .status(200)
            .json({ userInfo: createdUser, message: "Registration is success." });
    } catch (error) {
        console.log(error);
        fs.unlinkSync(profile_photo_path);
        fs.unlinkSync(cover_photo_path);
    }
};

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const existingUser = await User.findById(userId);

        if (!existingUser) {
            return res.status(404).json({ message: "No user found." });
        }

        const accessToken = await existingUser.generateAccessToken();
        const refreshToken = await existingUser.generateRefreshToken();

        existingUser.refresh_token = refreshToken;
        await existingUser.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong." });
    }
};

export const loginController = async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!existingUser) {
        return res.status(404).json({ message: "No user found." });
    }

    const isPassMatch = await existingUser.isPasswordMatch(password);

    if (!isPassMatch) {
        return res.status(401).json({ message: "Invaild Credentials." });
    }

    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(existingUser._id);

    const loggedUser = await User.findById(existingUser._id).select(
        "-password -refresh_token"
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json({ user: loggedUser, message: "Login success." });
};

export const generateNewRefreshToken = async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        return res.status(401).json({ message: "No refresh Token" });
    }

    try {
        const decodedToken = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET_KEY
        );

        const existingUser = User.findById(decodedToken?._id);
        if (!existingUser) {
            return res.status(404).json({
                message: "No user found.",
            });
        }

        if (incomingRefreshToken !== existingUser.refresh_token) {
            return res.status(401).json({ message: "Invalid refresh token." });
        }

        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken(existingUser._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({ message: "Token updated." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong." });
    }
};

export const logoutController = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(400).json({ message: "Unauthorized." });
    }

    try {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refresh_token: 1,
                },
            },
            { new: true }
        );

        const existingUser = await User.findById(req.user._id);
        console.log(existingUser);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        };

        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json({ message: `${req.user.username} logout successfully.` });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong." });
    }
};

export const changePasswordController = async (req, res) => {
    try {
        const existingUser = await User.findById(req.user._id);

        if (!existingUser) {
            return res.status(404).json({ message: "User not found." });
        }

        const { old_password, new_password } = req.body;
        if (!old_password || !new_password) {
            return res
                .status(400)
                .json({ message: "Both old and new passwords are required." });
        }

        // Compare the old password
        const isPassMatch = await existingUser.isPasswordMatch(old_password);
        if (!isPassMatch) {
            return res.status(401).json({ message: "Wrong Credentials." });
        }

        // Assign new password
        existingUser.password = new_password;
        await existingUser.save();

        return res
            .status(200)
            .json({ message: "New password is saved successfully." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong." });
    }
};

export const changeUsernameController = async (req, res) => {
    try {
        const existingUser = await User.findById(req.user._id);
        
        if (!existingUser) {
            return res.status(404).json({ message: "User not found." });
        }

        const { new_username, password } = req.body;
        if (!new_username || !password) {
            return res
                .status(400)
                .json({ message: "New username and password are required." });
        }

        const isPassMatch = await existingUser.isPasswordMatch(password);
        if (!isPassMatch) {
            return res.status(401).json({ message: "Wrong Credentials." });
        }

        existingUser.username = new_username;
        await existingUser.save();

        return res
            .status(200)
            .json({ message: "Change username successfully." });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong." });
    }
};
