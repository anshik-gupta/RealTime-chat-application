import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const validateImageContent = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        const detectedType = await fileTypeFromBuffer(req.file.buffer);

        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (
            !detectedType ||
            !allowedMimeTypes.includes(detectedType.mime) ||
            detectedType.mime !== req.file.mimetype
        ) {
            return res.status(400).json({
                message: "Invalid image file"
            });
        }

        next();
    } catch (error) {
        console.error("IMAGE VALIDATION ERROR:", error);

        return res.status(400).json({
            message: "Unable to validate image file"
        });
    }
};

export { validateImageContent };
export default upload;