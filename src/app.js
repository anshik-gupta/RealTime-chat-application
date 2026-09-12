import { timeStamp } from "console";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.set("view engine", "ejs");
app.set("views", "./src/views");

app.use(express.static("public"));


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
    res.render("homeView");
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});