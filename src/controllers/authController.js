import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

const getSignupController = (req, res, next) => {
    res.render("signup");
};

const postSignupController = async (req, res, next) => {

    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send("Passwords do not match");
    }

    const existingUser = await User.findOne({email});
    if(existingUser){
        return res.redirect("/login");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
        username,
        email,
        password: hashedPassword
    });

    return res.redirect("/login");

};

const getLoginController = (req, res, next) => {
    res.render("login");
};

const postLoginController = async (req, res, next) => {
    const {email, password} = req.body;

    const user = await User.findOne({email});

    if(!user){
        return res.status(400).send("Invalid email or password");
    }

    const isPassword = await bcrypt.compare(password, user.password);

    if(!isPassword){
        return res.status(400).send("Invalid email or password");
    }

    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, {
        httpOnly: true,
        maxAge: 7* 24* 60* 60* 1000
    });

    return res.redirect("/anshsdkjfi");
};

export {
    getSignupController,
    postSignupController,
    getLoginController,
    postLoginController
};