import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import getConversation from "../../controllers/conversationController.js";

const conversationRouter = express.Router();

conversationRouter.get(
    "/:userId",
    authMiddleware,
    getConversation
);

export default conversationRouter;