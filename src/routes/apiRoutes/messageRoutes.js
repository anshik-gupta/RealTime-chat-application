import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import getMessages from "../../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.get(
    "/:conversationId",
    authMiddleware,
    getMessages
);

export default messageRouter;