import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import upload, {validateImageContent} from "../../middleware/uploadMiddleware.js";
import uploadImage from "../../controllers/imageController.js";

const imageRouter = express.Router();

imageRouter.post(
    "/upload",
    authMiddleware,
    upload.single("image"),
    validateImageContent,
    uploadImage
);

export default imageRouter;