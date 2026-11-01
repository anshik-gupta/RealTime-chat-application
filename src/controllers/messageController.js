import mongoose from "mongoose";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messagesModel.js";
import cloudinary from "../config/cloudinary.js";

const getMessages = async (req, res, next) => {
    try{
        const currentUser = req.userId;
        const conversationId = req.params.conversationId;
        const before = req.query.before;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUser
        });

        if(!conversation){
            return res.status(404).json({
                message: "conversation not found"
            });
        }

        let query = {
            conversation: conversationId,
            deletedFor: { $ne: currentUser }
        };

        if(before){
            const cursorMessage = await Message.findOne({
                _id: before,
                conversation: conversationId
            });

            if(!cursorMessage){
                return res.status(400).json({
                    message: "invalid cursor"
                });
            }

            query.$or = [
                {
                    createdAt: {
                        $lt: cursorMessage.createdAt
                    }
                },
                {
                    createdAt: cursorMessage.createdAt,
                    _id: {
                        $lt: cursorMessage._id
                    }
                }
            ];
        }

        const messages = await Message.find(query)
            .populate("sender", "name")
            .sort({ createdAt: -1, _id: -1})
            .limit(21);

        const hasMore = messages.length > 20;

        if (hasMore) {
            messages.pop();
        }

        messages.reverse();

        const nextCursor = messages.length > 0 ? messages[0]._id : null;

        return res.json({
            messages,
            hasMore,
            nextCursor
        });

    }catch(error){
        console.log(error);

        return res.status(500).json({
            message: "error occured in finding messages"
        });
    }
}


const deleteMessage = async (req, res) => {
    try {
        const currentUser = req.userId;
        const messageId = req.params.messageId;
        const { deleteType } = req.body;

        if (!["me", "everyone"].includes(deleteType)) {
            return res.status(400).json({
                message: "Invalid delete type"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({
                message: "Invalid message ID"
            });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                message: "Message not found"
            });
        }

        // Verify that the user belongs to this conversation.
        const conversation = await Conversation.findOne({
            _id: message.conversation,
            participants: currentUser
        });

        if (!conversation) {
            return res.status(403).json({
                message: "You are not allowed to delete this message"
            });
        }

        // Delete for me.
        if (deleteType === "me") {
            const deletedMessage = await Message.updateOne(
                {
                    _id: messageId,
                    conversation: message.conversation
                },
                {
                    $addToSet: { deletedFor: currentUser }
                }
            );

            if (deletedMessage.matchedCount === 0) {
                return res.status(404).json({
                    message: "Message not found"
                });
            }

            return res.status(200).json({
                message: "Message deleted for you"
            });
        }

        // Only the original sender can delete for everyone.
        if (message.sender.toString() !== currentUser.toString()) {
            return res.status(403).json({
                message: "You can only delete your own messages for everyone"
            });
        }

        // Delete image from Cloudinary, if applicable.
        if (message.type === "image" && message.imagePublicId) {
            const result = await cloudinary.uploader.destroy(
                message.imagePublicId,
                { resource_type: "image" }
            );

            if (result.result !== "ok" && result.result !== "not found") {
                throw new Error("Cloudinary image deletion failed");
            }
        }

        // Permanently delete the message from MongoDB.
        const deletedMessage = await Message.deleteOne({
            _id: messageId,
            conversation: message.conversation,
            sender: currentUser
        });

        if (deletedMessage.deletedCount === 0) {
            return res.status(404).json({
                message: "Message not found"
            });
        }

        // Notify everyone in the conversation.
        const io = req.app.get("io");

        if (io) {
            io.to(message.conversation.toString()).emit(
                "messageDeleted",
                {
                    messageId: messageId,
                    conversationId: message.conversation.toString(),
                    deleteType: "everyone"
                }
            );
        }

        return res.status(200).json({
            message: "Message deleted for everyone"
        });

    } catch (error) {
        console.error("Delete message error:", error);

        return res.status(500).json({
            message: "Failed to delete message"
        });
    }
};



const clearChat = async (req, res) => {
    try {
        const currentUser = req.userId;
        const conversationId = req.params.conversationId;

        // Verify conversation membership
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUser
        });

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        // Mark all messages as deleted for the current user
        const result = await Message.updateMany(
            {
                conversation: conversationId,
                deletedFor: { $ne: currentUser }
            },
            {
                $addToSet: {
                    deletedFor: currentUser
                }
            }
        );

        return res.status(200).json({
            message: "Chat cleared successfully",
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("Clear chat error:", error);

        return res.status(500).json({
            message: "Failed to clear chat"
        });
    }
};

export { getMessages, deleteMessage, clearChat };