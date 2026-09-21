import express from "express";
const authRouter = express.Router();

import {
    getSignupController,
    postSignupController,
    getLoginController,
    postLoginController
} from "../controllers/authController.js";

authRouter.get("/signup", getSignupController);
authRouter.post("/signup", postSignupController);

authRouter.get("/login", getLoginController);
authRouter.post("/login", postLoginController);

export default authRouter;