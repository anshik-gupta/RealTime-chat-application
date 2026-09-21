const socket = io();

socket.on("connect", () => {
    console.log("Connected to server");
    console.log("Socket ID:", socket.id);
});

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event)=>{
    if(event.key==="Enter"){
        sendMessage();
    }
});

function sendMessage(){
    const message = messageInput.value.trim();

    if (message === "") {
        return;
    }

    socket.emit("sendMessage", message);

    messageInput.value = "";
}

socket.on("newMessage", (data) => {
    const messageWrapper = document.createElement("div");
    const messageElement = document.createElement("div");

    messageWrapper.classList.add("mb-2", "d-flex");

    if(data.senderId === socket.id){
        messageWrapper.classList.add("justify-content-end");
        messageElement.classList.add("d-inline-block", "bg-primary", "text-white", "p-2", "rounded");
    }else{
        messageWrapper.classList.add("justify-content-start");
        messageElement.classList.add("d-inline-block", "bg-light", "text-dark", "p-2", "rounded");
    }

    messageElement.textContent = data.message;

    messageWrapper.appendChild(messageElement);
    document.getElementById("messages").appendChild(messageWrapper);

});