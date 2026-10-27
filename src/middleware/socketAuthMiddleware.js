import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const socketAuthMiddleware = async (socket, next) => {
    const cookiesHeader = socket.handshake.headers.cookie || "";

    const cookieToken = cookiesHeader
        .split("; ")
        .find(cookie => cookie.startsWith("token="));

    const token = cookieToken?.split("=")[1];

    if (!token) {
        return next(new Error("Authentication required"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("_id");

        if (!user) {
            return next(new Error("Account no longer exists"));
        }

        socket.userId = user._id.toString();

        next();
    } catch (error) {
        console.error("SOCKET AUTH ERROR:", error);

        return next(new Error("Authentication failed"));
    }
};

export default socketAuthMiddleware;