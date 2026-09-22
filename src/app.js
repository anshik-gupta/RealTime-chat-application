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

    socket.on("sendMessage", (message) => {
        io.emit("newMessage", {
            message: message,
            senderId: socket.id,
            timestamp: new Date()
        });
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

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});