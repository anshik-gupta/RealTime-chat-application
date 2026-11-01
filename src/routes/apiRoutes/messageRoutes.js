import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import { getMessages, deleteMessage, clearChat } from "../../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.get(
    "/:conversationId",
    authMiddleware,
    getMessages
);

messageRouter.delete(
    "/:messageId",
    authMiddleware,
    deleteMessage
);

messageRouter.delete(
    "/conversation/:conversationId/clear",
    authMiddleware,
    clearChat
);
 
export default messageRouter;