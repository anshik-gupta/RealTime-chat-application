//core imports
import dns from "dns";
import "dotenv/config";
import connectDB from "./config/db.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

//userMade imports
import authRouter from "./routes/authRoutes.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

app.set("view engine", "ejs");
app.set("views", "./src/views");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

connectDB();

const PORT = 3000;

const server = createServer(app);

const io = new Server(server);

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("sendMessage", (message) => {
        io.emit("newMessage", {
            message: message,
            senderId: socket.id,
            timestamp: new Date()
        });
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

app.get("/", (req, res) => {
    res.redirect("/signup");
});

app.use("/", authRouter);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});