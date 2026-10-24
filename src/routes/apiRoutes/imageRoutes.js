import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import upload from "../../middleware/uploadMiddleware.js";
import uploadImage from "../../controllers/imageController.js";

const imageRouter = express.Router();

imageRouter.post(
    "/upload",
    authMiddleware,
    upload.single("image"),
    uploadImage
);

export default imageRouter;