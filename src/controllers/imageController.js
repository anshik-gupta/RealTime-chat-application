import Conversation from "../models/conversationModel.js";
import Message from "../models/messagesModel.js";

const uploadImage = async (req, res) => {
    try {
        const currentUser = req.userId;
        const { conversationId } = req.body;

        // Check whether an image was uploaded
        if (!req.file) {
            return res.status(400).json({
                message: "Please select an image"
            });
        }

        // Check whether a conversation ID was provided
        if (!conversationId) {
            return res.status(400).json({
                message: "Conversation ID is required"
            });
        }

        // Verify that the current user belongs to this conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUser
        });

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        // Create the public URL for the uploaded image
        const imageUrl = `/uploads/${req.file.filename}`;

        // Save the image message in MongoDB
        const message = await Message.create({
            conversation: conversationId,
            sender: currentUser,
            type: "image",
            imageUrl
        });

        // Get the existing Socket.IO instance
        const io = req.app.get("io");

        if (!io) {
            console.error("Socket.IO instance not found");

            return res.status(500).json({
                message: "Image saved, but real-time delivery failed"
            });
        }

        // Prepare the message data for connected clients
        const messageData = {
            _id: message._id.toString(),
            conversationId: conversationId,
            senderId: currentUser.toString(),
            type: message.type,
            imageUrl: message.imageUrl,
            status: message.status,
            createdAt: message.createdAt
        };

        // Broadcast the image message to the conversation room
        io.to(conversationId.toString()).emit(
            "newMessage",
            messageData
        );

        // Notify the other participant
        conversation.participants.forEach(participant => {
            if (participant.toString() !== currentUser.toString()) {
                io.to(participant.toString()).emit(
                    "newMessageNotification",
                    {
                        conversationId: conversationId.toString(),
                        messageId: message._id.toString()
                    }
                );
            }
        });

        // Return the saved message to the uploader
        return res.status(201).json({
            message: "Image uploaded successfully",
            data: message
        });

    } catch (error) {
        console.error("Image upload error:", error);

        return res.status(500).json({
            message: "Failed to upload image"
        });
    }
};

export default uploadImage;