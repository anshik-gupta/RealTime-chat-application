import express from "express";
import {
    getSignupController,
    postSignupController,
    getLoginController,
    postLoginController,
    postLogout
} from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.get("/signup", getSignupController);
authRouter.post("/signup", postSignupController);

authRouter.get("/login", getLoginController);
authRouter.post("/login", postLoginController);

authRouter.post("/logout", postLogout);

export default authRouter;