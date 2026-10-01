import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messagesModel.js";

const getChat = async (req, res, next) => {
    const conversations = await Conversation.find({
        participants: req.userId
    }).populate("participants", "name username");

    const users = await Promise.all(
        conversations.map(async conversation =>{

            const user = conversation.participants.find(
                user => user._id.toString() !== req.userId.toString()
            );

            const unreadCount = await Message.countDocuments({
                conversation: conversation._id,
                sender: {$ne: req.userId},
                status: {$ne: "read"}
            });

            return {
                ...user.toObject(),
                conversationId: conversation._id,
                unreadCount
            }
        })
    );

    res.render("home",{
        users
    });
}

const getProfile = async (req, res, next) => {
    const user = await User.findById(req.userId);

    res.render("profile", {
        user: user
    })
}

export {
    getChat,
    getProfile
};