import User from "../models/userModel.js";

const searchUsers = async (req, res) => {
    try {
        const query = req.query.q?.trim();

        if (!query) {
            return res.json([]);
        }

        const users = await User.find({
            _id: { $ne: req.userId },
            $or: [
                { name: { $regex: query, $options: "i" } },
                { username: { $regex: query, $options: "i" } },
                { phone: { $regex: query } }
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