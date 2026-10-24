import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: ["text", "image"],
            default: "text",
            required: true
        },

        text: {
            type: String,
            trim: true,
            required: function () {
                return this.type === "text";
            }
        },

        imageUrl: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent"
        }
    },
    {
        timestamps: true,
        collection: "Messages"
    }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;