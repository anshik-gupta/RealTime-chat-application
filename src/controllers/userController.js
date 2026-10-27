import User from "../models/userModel.js";

// Escape special regex characters so the query is treated literally.
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const searchUsers = async (req, res) => {
    try {
        // Ensure the query is a string.
        if (typeof req.query.q !== "string") {
            return res.json([]);
        }

        const query = req.query.q.trim();

        // Return no results for an empty query.
        if (!query) {
            return res.json([]);
        }

        // Prevent unnecessarily long search queries.
        if (query.length > 50) {
            return res.status(400).json({
                message: "Search query must not exceed 50 characters"
            });
        }

        // Escape regex special characters.
        const safeQuery = escapeRegex(query);

        const users = await User.find({
            _id: { $ne: req.userId },
            $or: [
                { name: { $regex: safeQuery, $options: "i" } },
                { username: { $regex: safeQuery, $options: "i" } },
                { phone: { $regex: safeQuery } }
            ]
        })
        .select("name username phone")
        .limit(10);

        return res.json(users);

    } catch (error) {
        console.error("USER SEARCH ERROR:", error);

        return res.status(500).json({
            message: "Failed to search users"
        });
    }
};

export default searchUsers;