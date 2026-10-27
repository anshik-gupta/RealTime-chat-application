// Core imports
import dns from "dns";
import "dotenv/config";
import connectDB from "./config/db.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";

// User-made imports
import authRouter from "./routes/authRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import conversationRouter from "./routes/apiRoutes/conversationRoutes.js";
import messageRouter from "./routes/apiRoutes/messageRoutes.js";
import userRouter from "./routes/apiRoutes/userRoutes.js";
import imageRouter from "./routes/apiRoutes/imageRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import socketAuthMiddleware from "./middleware/socketAuthMiddleware.js";

import Message from "./models/messagesModel.js";
import Conversation from "./models/conversationModel.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

app.set("view engine", "ejs");
app.set("views", "./src/views");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;

const server = createServer(app);

const io = new Server(server);
app.set("io", io);

io.use(socketAuthMiddleware);

const onlineUsers = new Map();

io.on("connection", async (socket) => {
    console.log("A user connected:", socket.userId);

    socket.join(socket.userId.toString());

    const onlineCount = onlineUsers.get(socket.userId.toString()) || 0;

    onlineUsers.set(socket.userId.toString(), onlineCount + 1);

    const becameOnline = onlineCount === 0;

    const conversations = await Conversation.find({
        participants: socket.userId
    });

    if (becameOnline) {
        conversations.forEach(conv => {
            conv.participants.forEach(participant => {
                if (participant.toString() !== socket.userId.toString()) {
                    io.to(participant.toString()).emit("userOnline", {
                        userId: socket.userId.toString()
                    });
                }
            });
        });
    }

    const conversationIds = conversations.map(conversation => conversation._id);

    const pendingMessages = await Message.find({
        conversation: { $in: conversationIds },
        sender: { $ne: socket.userId },
        status: "sent"
    });

    socket.emit("pendingMessages", pendingMessages);

    socket.on("sendMessage", async (data) => {
        try {
            const { conversationId, message } = data;

            if (typeof message !== "string") {
                return;
            }

            const cleanMessage = message.trim();

            if (cleanMessage === "") {
                return;
            }

            // Check whether the user belongs to this conversation.
            const conv = await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

            if (!conv) {
                return;
            }

            const newMessage = await Message.create({
                conversation: conversationId,
                sender: socket.userId,
                text: cleanMessage
            });

            io.to(conversationId).emit("newMessage", {
                _id: newMessage._id,
                conversationId: conversationId,
                senderId: socket.userId,
                message: newMessage.text,
                status: newMessage.status,
                createdAt: newMessage.createdAt
            });

            conv.participants.forEach(participant => {
                if (participant.toString() !== socket.userId.toString()) {
                    io.to(participant.toString()).emit("newMessageNotification", {
                        conversationId: conversationId,
                        messageId: newMessage._id
                    });
                }
            });

        } catch (error) {
            console.error("SEND MESSAGE ERROR:", error);
        }
    });

    // Mark a single message as delivered.
    socket.on("messageDelivered", async (messageId) => {
        try {
            const message = await Message.findOne({
                _id: messageId
            });

            if (!message) {
                return;
            }

            const conv = await Conversation.findOne({
                _id: message.conversation,
                participants: socket.userId
            });

            if (!conv) {
                return;
            }

            // A user cannot mark their own message as delivered.
            if (message.sender.toString() === socket.userId.toString()) {
                return;
            }

            // Only "sent" messages can become "delivered".
            // The status condition makes the update atomic.
            const updatedMessage = await Message.findOneAndUpdate(
                {
                    _id: messageId,
                    conversation: message.conversation,
                    status: "sent",
                    sender: { $ne: socket.userId }
                },
                {
                    $set: { status: "delivered" }
                },
                {
                    new: true
                }
            );

            if (!updatedMessage) {
                return;
            }

            io.to(updatedMessage.sender.toString()).emit("messageStatusUpdated", {
                messageId: updatedMessage._id,
                status: updatedMessage.status
            });

        } catch (error) {
            console.error("MESSAGE DELIVERED ERROR:", error);
        }
    });

    // Mark a single message as read.
    socket.on("messageRead", async (messageId) => {
        try {
            const message = await Message.findOne({
                _id: messageId
            });

            if (!message) {
                return;
            }

            const conv = await Conversation.findOne({
                _id: message.conversation,
                participants: socket.userId
            });

            if (!conv) {
                return;
            }

            // A user cannot mark their own message as read.
            if (message.sender.toString() === socket.userId.toString()) {
                return;
            }

            // Only "sent" or "delivered" messages can become "read".
            const updatedMessage = await Message.findOneAndUpdate(
                {
                    _id: messageId,
                    conversation: message.conversation,
                    status: { $in: ["sent", "delivered"] },
                    sender: { $ne: socket.userId }
                },
                {
                    $set: { status: "read" }
                },
                {
                    new: true
                }
            );

            if (!updatedMessage) {
                return;
            }

            io.to(updatedMessage.sender.toString()).emit("messageStatusUpdated", {
                messageId: updatedMessage._id,
                status: updatedMessage.status
            });

        } catch (error) {
            console.error("MESSAGE READ ERROR:", error);
        }
    });

    // Mark all eligible incoming messages in a conversation as read.
    socket.on("messagesRead", async (conversationId) => {
        try {
            const conv = await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

            if (!conv) {
                return;
            }

            const messages = await Message.find({
                conversation: conversationId,
                sender: { $ne: socket.userId },
                status: { $in: ["sent", "delivered"] }
            }).select("_id sender");

            for (const message of messages) {
                // Update each message atomically.
                // A concurrent update cannot change "read" back to an
                // earlier status, and an unchanged message sends no event.
                const updatedMessage = await Message.findOneAndUpdate(
                    {
                        _id: message._id,
                        conversation: conversationId,
                        sender: { $ne: socket.userId },
                        status: { $in: ["sent", "delivered"] }
                    },
                    {
                        $set: { status: "read" }
                    },
                    {
                        new: true
                    }
                );

                if (updatedMessage) {
                    io.to(updatedMessage.sender.toString()).emit("messageStatusUpdated", {
                        messageId: updatedMessage._id,
                        status: updatedMessage.status
                    });
                }
            }

        } catch (error) {
            console.error("MESSAGES READ ERROR:", error);
        }
    });

    socket.on("joinConversation", async (conversationId) => {
        const conv = await Conversation.findOne({
            _id: conversationId,
            participants: socket.userId
        });

        if (!conv) {
            return;
        }

        socket.join(conversationId);
    });

    socket.on("leaveConversation", (conversationId) => {
        socket.leave(conversationId);
    });

    socket.on("presenceCheck", (userId) => {
        const isOnline = onlineUsers.has(userId.toString());

        socket.emit("presenceStatus", {
            userId: userId,
            online: isOnline
        });
    });

    socket.on("startTyping", async (conversationId) => {
        try {
            const conStaTy = await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

            if (!conStaTy) {
                return;
            }

            socket.to(conversationId).emit("userTyping", {
                userId: socket.userId.toString()
            });

        } catch (error) {
            console.error("START TYPING ERROR:", error);
        }
    });

    socket.on("stoppedTyping", async (conversationId) => {
        try {
            const conStoTy = await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

            if (!conStoTy) {
                return;
            }

            socket.to(conversationId).emit("userStoppedTyping", {
                userId: socket.userId.toString()
            });

        } catch (error) {
            console.error("STOPPED TYPING ERROR:", error);
        }
    });

    socket.on("disconnect", async (reason) => {
        console.log("SOCKET DISCONNECTED:", socket.userId, reason);

        const onlineCount = onlineUsers.get(socket.userId.toString());

        if (onlineCount <= 1) {
            onlineUsers.delete(socket.userId.toString());

            const conversations = await Conversation.find({
                participants: socket.userId
            });

            conversations.forEach(conv => {
                conv.participants.forEach(participant => {
                    if (participant.toString() !== socket.userId.toString()) {
                        io.to(participant.toString()).emit("userOffline", {
                            userId: socket.userId.toString()
                        });
                    }
                });
            });

        } else {
            onlineUsers.set(socket.userId.toString(), onlineCount - 1);
        }
    });
});

app.get("/", authMiddleware, (req, res) => {
    res.redirect("/chat");
});

app.use("/", authRouter);
app.use("/chat", chatRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messageRouter);
app.use("/api/users", userRouter);
app.use("/api/images", imageRouter);

const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();