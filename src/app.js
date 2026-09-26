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

io.on("connection", async (socket) => {
    console.log("A user connected:", socket.userId);

    socket.join(socket.userId.toString());

    const conversations = await Conversation.find({
        participants: socket.userId
    });

    const conversationIds = conversations.map(conversation => conversation._id);

    const pendingMessages = await Message.find({
        conversation: {$in: conversationIds},
        sender: {$ne: socket.userId},
        status: "sent"
    })

    socket.emit("pendingMessages", pendingMessages);

    socket.on("messagesRead", async (conversationId)=>{
        try{
            const conv = await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

            if (!conv) {
                return;
            }
            
            const messages = await Message.find({
                conversation: conversationId,
                sender: {$ne: socket.userId},
                status: "delivered"
            });
            
            await Message.updateMany(
                {
                    conversation: conversationId,
                    sender: {$ne: socket.userId},
                    status: "delivered"
                },{
                    $set: {status: "read"}
                }
            )

            messages.forEach(message => {
                io.to(message.sender.toString()).emit("messageStatusUpdated", {
                    messageId: message._id,
                    status: "read"
                });
            });
            
        }catch(error){
            console.error(error);
        }
    });

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

            io.to(conversationId).emit("newMessage", {
                _id: newMessage._id,
                conversationId: conversationId,
                senderId: socket.userId,
                message: newMessage.text,
                status: newMessage.status,
                createdAt: newMessage.createdAt 
            });
        } catch (error) {
            console.error("SEND MESSAGE ERROR:", error);
        }
    });

    socket.on("messageDelivered", async (messageId)=>{
        try{
            const message = await Message.findOne({
                _id: messageId
            });

            if(!message){
                return;
            }

            const conv = await Conversation.findOne({
                _id: message.conversation,
                participants: socket.userId
            });

            if(!conv){
                return;
            }

            if(message.sender.toString() === socket.userId.toString()){
                return;
            }

            message.status = "delivered";
            await message.save();

            io.to(message.sender.toString()).emit("messageStatusUpdated", {
                messageId: message._id,
                status: message.status
            });

        }catch(error){
            console.error("MESSAGE DELIVERED ERROR:", error);
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