import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect("/login");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("_id");

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        req.userId = user._id.toString();

        next();
    } catch (error) {
        res.clearCookie("token");
        return res.redirect("/login");
    }
};

export default authMiddleware;