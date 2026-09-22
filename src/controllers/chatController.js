import User from "../models/userModel.js";

const getChat = (req, res, next) => {
    res.render("home.ejs");
}

const getProfile = async (req, res, next) => {
    const user = await User.findById(req.userId);

    res.render("profile", {
        user: user
    })
}

export {
    getChat,
    getProfile
};