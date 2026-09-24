//core imports
import dns from "dns";
import "dotenv/config";
import connectDB from "./config/db.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";

//userMade imports
import authRouter from "./routes/authRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import socketAuthMiddleware from "./middleware/socketAuthMiddleware.js";
import conversationRouter from "./routes/apiRoutes/conversationRoutes.js";
import messageRouter from "./routes/apiRoutes/messageRoutes.js";
import Message from "./models/messagesModel.js";
import Conversation from "./models/conversationModel.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

app.set("view engine", "ejs");
app.set("views", "./src/views");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();

const PORT = 3000;

const server = createServer(app);

const io = new Server(server);

io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
    console.log("A user connected:", socket.userId);

    socket.on("sendMessage", async (data) => {
        try{
            const {conversationId, message} = data;

            if(typeof message !== "string"){
                return;
            }

            const cleanMessage = message.trim();

            if(cleanMessage===""){
                return;
            }

            //checking the socket.userId exists in the conversation or not
            const conv = await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

            if(!conv){
                return;
            }

            const newMessage = await Message.create({
                conversation: conversationId,
                sender: socket.userId,
                text: cleanMessage
            });
            console.log("messageSaved: ", newMessage._id);

            io.to(conversationId).emit("newMessage", {
                _id: newMessage._id,
                conversationId: conversationId,
                senderId: socket.userId,
                message: newMessage.text,
                createdAt: newMessage.createdAt 
            });
        } catch (error) {
            console.error("SEND MESSAGE ERROR:", error);
        }
    });

    socket.on("joinConversation", async (conversationId) => {

        const conv = await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

            if(!conv){
                return;
            }

        socket.join(conversationId);
    });

    socket.on("leaveConversation", (conversationId) => {
        socket.leave(conversationId);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.userId);
    });
});

app.get("/", authMiddleware, (req, res) => {
    res.redirect("/chat");
});

app.use("/", authRouter);
app.use("/chat", chatRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messageRouter);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});