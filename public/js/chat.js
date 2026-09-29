const socket = io();

let currentUserId = null;
let currentConversationId = null;
let nextCursor = null;
let hasMoreMessages = true;
let loadingOlderMessages = false;
const messagesContainer = document.getElementById("messages");

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
        statusElement.innerHTML = '<span style="letter-spacing: -5px; font-weight: bold; color: #8696A0;">&#x2713;&#x2713;</span>';
    }else if (status === "read") {
        statusElement.innerHTML = '<span style="letter-spacing: -5px; font-weight: bold; color: #34B7F1;">&#x2713;&#x2713;</span>';
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

    const message = {
        _id: data._id,
        sender: {
            _id: data.senderId
        },
        text: data.message,
        status: data.status
    };

    const messageWrapper = createMessageElement(message);

    messagesContainer.appendChild(messageWrapper);

    if (data.senderId === currentUserId) {
        // Nothing else needed
    } else {
        if (data.conversationId === currentConversationId) {
            socket.emit("messageRead", data._id);
        } else {
            socket.emit("messageDelivered", data._id);
        }
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

const chatUsers = document.querySelectorAll(".chat-user");
const emptyChat = document.getElementById("emptyChat");
const chatArea = document.getElementById("chatArea");
const chatUsername = document.getElementById("chatUsername");
let currentChatUserId = null;
let otherUserOnline = false;

chatUsers.forEach(user => {
    user.addEventListener("click", async () => {

        const userId = user.dataset.userId;
        const username = user.querySelector("strong").textContent;

        currentChatUserId = userId;

        socket.emit("presenceCheck", userId);

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

        nextCursor = messageData.nextCursor;
        hasMoreMessages = messageData.hasMore;

        displayMessages(messageData.messages);
        socket.emit("messagesRead", currentConversationId);

        // Show chat
        emptyChat.classList.add("d-none");

        chatArea.classList.remove("d-none");
        chatArea.classList.add("d-flex");

        chatUsername.textContent = username;

        requestAnimationFrame(() => {messagesContainer.scrollTop = messagesContainer.scrollHeight;});
    });
});

let typeTimer;

messageInput.addEventListener("input", ()=>{
    if(!currentConversationId){
        return;
    }
    socket.emit("startTyping", currentConversationId);

    clearTimeout(typeTimer);

    typeTimer = setTimeout(()=>{
        socket.emit("stoppedTyping", currentConversationId);
    },1000);
});

function createMessageElement(message) {
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

    if (message.sender._id === currentUserId) {
        const statusElement = document.createElement("span");

        statusElement.classList.add("ms-1", "message-status");

        if (message.status === "sent") {
            statusElement.innerHTML =
                '<span style="letter-spacing: -5px; font-weight: bold; color: #8696A0;">&#x2713;</span>';
        } else if (message.status === "delivered") {
            statusElement.innerHTML =
                '<span style="letter-spacing: -5px; font-weight: bold; color: #8696A0;">&#x2713;&#x2713;</span>';
        } else if (message.status === "read") {
            statusElement.innerHTML =
                '<span style="letter-spacing: -5px; font-weight: bold; color: #34B7F1;">&#x2713;&#x2713;</span>';
        }

        messageWrapper.appendChild(statusElement);
    }

    return messageWrapper;
}

function displayMessages(messages) {
    messagesContainer.innerHTML = "";

    messages.forEach(message => {
        const messageWrapper = createMessageElement(message);

        messagesContainer.appendChild(messageWrapper);
    });
}

messagesContainer.addEventListener("scroll", async () => {

    if (messagesContainer.scrollTop !== 0) {
        return;
    }

    if (!hasMoreMessages) {
        return;
    }

    if (loadingOlderMessages) {
        return;
    }

    await loadOlderMessages();
});

async function loadOlderMessages() {

    if (!currentConversationId || !nextCursor) {
        return;
    }

    loadingOlderMessages = true;

    const oldScrollHeight = messagesContainer.scrollHeight;

    try {

        const response = await fetch(
            `/api/messages/${currentConversationId}?before=${nextCursor}`
        );

        const data = await response.json();

        if (!response.ok) {
            console.log(data.message);
            return;
        }

        const oldMessages = data.messages;

        // Add older messages before the existing ones
        prependMessages(oldMessages);

        nextCursor = data.nextCursor;
        hasMoreMessages = data.hasMore;

        const newScrollHeight = messagesContainer.scrollHeight;

        messagesContainer.scrollTop = newScrollHeight - oldScrollHeight;

    } catch(error) {

        console.error("ERROR LOADING OLDER MESSAGES:", error);

    } finally {

        loadingOlderMessages = false;
    }
}

function prependMessages(messages) {

    [...messages].reverse().forEach(message => {
        const messageWrapper = createMessageElement(message);

        messagesContainer.prepend(messageWrapper);
    });
}

const userPresence = document.getElementById("chatPresence");

socket.on("userOnline", (data) => {

    if (data.userId !== currentChatUserId) {
        return;
    }

    otherUserOnline = true;

    userPresence.textContent = "● Online";

    userPresence.classList.remove("text-muted");
    userPresence.classList.add("text-success");
});

socket.on("userOffline", (data) => {

    if (data.userId !== currentChatUserId) {
        return;
    }

    otherUserOnline = false;

    userPresence.textContent = "○ Offline";

    userPresence.classList.remove("text-success");
    userPresence.classList.add("text-muted");
});

socket.on("presenceStatus", (data) => {
    if (data.userId !== currentChatUserId) {
        return;
    }

    otherUserOnline = data.online;

    if (data.online) {
        userPresence.textContent = "● Online";
        userPresence.classList.remove("text-muted");
        userPresence.classList.add("text-success");
    } else {
        userPresence.textContent = "○ Offline";
        userPresence.classList.remove("text-success");
        userPresence.classList.add("text-muted");
    }
});

socket.on("userTyping", (data)=>{
    if(data.userId !== currentChatUserId){
        return;
    }

    userPresence.textContent = "typing...";
    userPresence.classList.remove("text-success", "text-muted");
});

socket.on("userStoppedTyping", (data)=>{
    if(data.userId !== currentChatUserId){
        return;
    }

    if(otherUserOnline){
        userPresence.textContent = "● Online";
        userPresence.classList.remove("text-muted");
        userPresence.classList.add("text-success");
    }else{
        userPresence.textContent = "○ Offline";
        userPresence.classList.remove("text-success");
        userPresence.classList.add("text-muted");
    }
});