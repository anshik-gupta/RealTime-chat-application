import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    getChat,
    getProfile} from "../controllers/chatController.js";


const chatRouter = express.Router();

chatRouter.get("/", authMiddleware, getChat);
chatRouter.get("/profile", authMiddleware, getProfile);

export default chatRouter;