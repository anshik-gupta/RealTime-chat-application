const socket = io();

let currentUserId = null;
let currentConversationId = null;

socket.on("connect", () => {
    console.log("Connected to server");
    console.log("Socket ID:", socket.id);

    if(currentConversationId){
        socket.emit("joinConversation", currentConversationId);
    }
});

socket.on("messageStatusUpdated", (messageData)=>{
    const {messageId, status} = messageData;

     const messageWrapper =
        document.querySelector(`[data-message-id="${messageId}"]`);

    if (!messageWrapper) {
        return;
    }

    const statusElement =
        messageWrapper.querySelector(".message-status");

    if (!statusElement) {
        return;
    }

    if (status === "delivered") {
        statusElement.textContent = "✓✓";
    }else if (status === "read") {
        statusElement.textContent = "✓✓";
        statusElement.classList.add("text-info");
    }
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

    if(!currentConversationId){
        return;
    }

    socket.emit("sendMessage", {
        conversationId: currentConversationId,
        message: message
    });

    messageInput.value = "";
}

socket.on("pendingMessages", (messages) => {
    messages.forEach(message => {
        socket.emit("messageDelivered", message._id);
    });
});

socket.on("newMessage", (data) => {
    const messageWrapper = document.createElement("div");
    const messageElement = document.createElement("div");
    const messagesContainer = document.getElementById("messages");

    messageWrapper.classList.add("mb-2", "d-flex");
    messageWrapper.dataset.messageId = data._id;

    if (data.senderId === currentUserId) {
        messageWrapper.classList.add("justify-content-end");

        messageElement.classList.add(
            "d-inline-block",
            "bg-primary",
            "text-white",
            "p-2",
            "rounded"
        );
    } else {
        messageWrapper.classList.add("justify-content-start");

        messageElement.classList.add(
            "d-inline-block",
            "bg-light",
            "text-dark",
            "p-2",
            "rounded"
        );
    }

    messageElement.textContent = data.message;

    messageWrapper.appendChild(messageElement);
    document.getElementById("messages").appendChild(messageWrapper);

    if(data.senderId === currentUserId){
        const statusElement = document.createElement("span");
        statusElement.classList.add("ms-1", "message-status");

        if(data.status === "sent"){
            statusElement.textContent = "✓";
        }else if(data.status === "delivered"){
            statusElement.textContent = "✓✓";
        }else if(data.status === "read"){
            statusElement.textContent = "✓✓";
            statusElement.classList.add("text-info");
        }

        messageWrapper.appendChild(statusElement);
    }else{
        socket.emit("messageDelivered", data._id);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

const chatUsers = document.querySelectorAll(".chat-user");
const emptyChat = document.getElementById("emptyChat");
const chatArea = document.getElementById("chatArea");
const chatUsername = document.getElementById("chatUsername");

chatUsers.forEach(user => {
    user.addEventListener("click", async () => {

        const userId = user.dataset.userId;
        const username = user.querySelector("strong").textContent;

        // Get conversation
        const conversationResponse =
            await fetch(`/api/conversations/${userId}`);

        const conversationData =
            await conversationResponse.json();

        if (!conversationResponse.ok) {
            console.log(conversationData.message);
            return;
        }

        currentUserId = conversationData.currentUserId;

        const newConversationId = conversationData.conversationId;

        console.log("conversationId:", newConversationId);

        // Leave previous conversation
        if (currentConversationId) {
            socket.emit("leaveConversation", currentConversationId);
        }

        // Set new conversation
        currentConversationId = newConversationId;

        // Join new conversation
        socket.emit("joinConversation", currentConversationId);

        // Get messages
        const messageResponse =
            await fetch(`/api/messages/${currentConversationId}`);

        const messageData =
            await messageResponse.json();

        if (!messageResponse.ok) {
            console.log(messageData.message);
            return;
        }

        displayMessages(messageData.messages);
        socket.emit("messagesRead", currentConversationId);

        // Show chat
        emptyChat.classList.add("d-none");

        chatArea.classList.remove("d-none");
        chatArea.classList.add("d-flex");

        chatUsername.textContent = username;
    });
});

function displayMessages(messages) {
    const messagesContainer = document.getElementById("messages");

    messagesContainer.innerHTML = "";

    messages.forEach(message => {
        const messageWrapper = document.createElement("div");
        const messageElement = document.createElement("div");

        messageWrapper.classList.add("mb-2", "d-flex");
        messageWrapper.dataset.messageId = message._id;

        if (message.sender._id === currentUserId) {
            messageWrapper.classList.add("justify-content-end");

            messageElement.classList.add(
                "d-inline-block",
                "bg-primary",
                "text-white",
                "p-2",
                "rounded"
            );
        } else {
            messageWrapper.classList.add("justify-content-start");

            messageElement.classList.add(
                "d-inline-block",
                "bg-light",
                "text-dark",
                "p-2",
                "rounded"
            );
        }

        messageElement.textContent = message.text;

        messageWrapper.appendChild(messageElement);
        messagesContainer.appendChild(messageWrapper);

        if(message.sender._id === currentUserId){
        const statusElement = document.createElement("span");
        statusElement.classList.add("ms-1", "message-status");

        if(message.status === "sent"){
            statusElement.textContent = "✓";
        }else if(message.status === "delivered"){
            statusElement.textContent = "✓✓";
        }else if(message.status === "read"){
            statusElement.textContent = "✓✓";
            statusElement.classList.add("text-info");
        }

        messageWrapper.appendChild(statusElement);
    }

    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}