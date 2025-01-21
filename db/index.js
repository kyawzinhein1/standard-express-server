import mongoose from "mongoose";

const DB_NAME = "test";

export const connectDB = async () => {
    try {
        const connectionResponse = await mongoose.connect(
            `${process.env.MONGO_URL}/${DB_NAME}`
        );
        console.log(
            "DB connected successfully",
            connectionResponse.connection.host
        );
    } catch (error) {
        console.log("DB connection error", error);
        process.exit(1);
    }
};
