import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import searchUsers from "../../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/search",authMiddleware, searchUsers);

export default userRouter;