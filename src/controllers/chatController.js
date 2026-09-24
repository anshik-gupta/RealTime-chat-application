import User from "../models/userModel.js";

const getChat = async (req, res, next) => {
    const users = await User.find({
        _id: {$ne: req.userId}
    }).select("username email");

    res.render("home",{
        users
    });
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