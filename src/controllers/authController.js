import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

const getSignupController = (req, res, next) => {
    res.render("signup");
};

const postSignupController = async (req, res, next) => {
    try {
        let { name, username, email, phone, password, confirmPassword } = req.body;

        // 1. Check that all required fields are provided
        if (!name || !username || !email || !phone || !password || !confirmPassword) {
            return res.status(400).send("All fields are required");
        }

        // 2. Normalize input
        name = name.trim();
        username = username.trim();
        email = email.trim().toLowerCase();
        phone = phone.trim();

        // 3. Validate required fields after trimming
        if (!name || !username || !email || !phone) {
            return res.status(400).send("Fields cannot contain only spaces");
        }

        // 4. Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).send("Please enter a valid email address");
        }

        // 5. Validate password length
        if (password.length < 8) {
            return res.status(400).send("Password must be at least 8 characters long");
        }

        // 6. Check password confirmation
        if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match");
        }

        // 7. Check whether the email, username, or phone already exists
        const existingUser = await User.findOne({
            $or: [
                { email },
                { username },
                { phone }
            ]
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).send("Email is already registered");
            }

            if (existingUser.username === username) {
                return res.status(409).send("Username is already taken");
            }

            return res.status(409).send("Phone number is already registered");
        }

        // 8. Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 9. Create the account
        await User.create({
            name,
            username,
            email,
            phone,
            password: hashedPassword
        });

        return res.redirect("/login");

    } catch (error) {
        // 10. Handle duplicate-key errors caused by simultaneous requests
        if (error.code === 11000) {
            return res.status(409).send("Email, username, or phone number is already registered");
        }

        // 11. Handle unexpected errors
        console.error("SIGNUP ERROR:", error);
        return res.status(500).send("Something went wrong. Please try again later");
    }
};

const getLoginController = (req, res, next) => {
    res.render("login");
};

const postLoginController = async (req, res, next) => {
    const {email, password} = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({normalizedEmail});

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
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7* 24* 60* 60* 1000
    });

    return res.redirect("/");
};

const postLogout = (req, res, next) =>{
    res.clearCookie("token");
    res.redirect("/login");
}

export {
    getSignupController,
    postSignupController,
    getLoginController,
    postLoginController,
    postLogout
};