
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";

const getConversation = async (req, res) => {
    try {
        const currentUserId = req.userId.toString();
        const otherUserId = req.params.userId;

        // Prevent users from starting a conversation with themselves.
        if (currentUserId === otherUserId) {
            return res.status(400).json({
                message: "You cannot create a conversation with yourself"
            });
        }

        const otherUser = await User.findById(otherUserId);

        if (!otherUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Normalize participant IDs to create a consistent pair.
        const participants = [
            currentUserId,
            otherUserId
        ].sort();

        const participantPair = participants.join("_");

        let conversation;

        try {
            conversation = await Conversation.create({
                participants,
                participantPair
            });
        } catch (error) {
            // Another request may have created this conversation.
            if (error.code === 11000) {
                conversation = await Conversation.findOne({
                    participantPair
                });

                if (!conversation) {
                    throw error;
                }
            } else {
                throw error;
            }
        }

        return res.json({
            conversationId: conversation._id,
            currentUserId: currentUserId,
            user: {
                _id: otherUser._id,
                name: otherUser.name,
                username: otherUser.username
            }
        });

    } catch (error) {
        console.error("CONVERSATION ERROR:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};

export default getConversation;
