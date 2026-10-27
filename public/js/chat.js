const socket = io();

let currentUserId = null;
let currentConversationId = null;
let nextCursor = null;
let hasMoreMessages = true;
let loadingOlderMessages = false;
const messagesContainer = document.getElementById("messages");
const logoutForm = document.getElementById("logoutForm");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const chatUsersContainer = document.getElementById("chatUsersContainer");

const imageModal = document.getElementById("imageModal");
const enlargedImage = document.getElementById("enlargedImage");
const closeImageModal = document.getElementById("closeImageModal");


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

const imageButton = document.getElementById("imageButton");
const imageInput = document.getElementById("imageInput");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const removeImageButton = document.getElementById("removeImageButton");

let selectedImage = null;
let previewUrl = null;

imageButton.addEventListener("click", () => {
    if (!currentConversationId) {
        alert("Please open a chat first.");
        return;
    }

    imageInput.click();
});

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        imageInput.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be 5 MB or less.");
        imageInput.value = "";
        return;
    }

    selectedImage = file;

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
    }

    messageInput.focus();

    previewUrl = URL.createObjectURL(file);
    imagePreview.src = previewUrl;
    imagePreviewContainer.classList.remove("d-none");
});

removeImageButton.addEventListener("click", () => {
    selectedImage = null;
    imageInput.value = "";

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }

    imagePreview.src = "";
    imagePreviewContainer.classList.add("d-none");
});

sendButton.addEventListener("click", () => {
    if (selectedImage) {
        sendImage();
    } else {
        sendMessage();
    }
});

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter"  && !event.shiftKey) {
        event.preventDefault();

        if (selectedImage) {
            sendImage();
        } else {
            sendMessage();
        }
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

async function sendImage() {
    if (!currentConversationId) {
        alert("Please open a chat first.");
        return;
    }

    if (!selectedImage) {
        return;
    }

    const formData = new FormData();

    formData.append("conversationId", currentConversationId);
    formData.append("image", selectedImage);

    sendButton.disabled = true;
    imageButton.disabled = true;

    try {
        const response = await fetch("/api/images/upload", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Image upload failed.");
            return;
        }

        // Clear the selected image after successful upload
        selectedImage = null;
        imageInput.value = "";

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }

        imagePreview.src = "";
        imagePreviewContainer.classList.add("d-none");

    } catch (error) {
        console.error("IMAGE UPLOAD ERROR:", error);
        alert("Unable to upload image. Please try again.");
    } finally {
        sendButton.disabled = false;
        imageButton.disabled = false;
    }
}

function increaseUnreadCount(conversationId){
    const chat = document.querySelector(`.chat-user[data-conversation-id="${conversationId}"]`);

    if(!chat){
        return;
    }

    let unreadBadge = chat.querySelector(".unread-badge");

    if(!unreadBadge){
        unreadBadge = document.createElement("span");
        unreadBadge.classList.add("unread-badge");
        unreadBadge.textContent = "1";
        chat.appendChild(unreadBadge);
        return;
    }

    unreadBadge.textContent = Number(unreadBadge.textContent)+1;

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
        type: data.type || "text",
        text: data.message || "",
        imageUrl: data.imageUrl || null,
        status: data.status
    };

    const messageWrapper = createMessageElement(message);

    messagesContainer.appendChild(messageWrapper);

    if (data.senderId === currentUserId) {
        // Nothing else needed
    } else {
        if (data.conversationId === currentConversationId) {
            socket.emit("messageRead", data._id);
        }
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

const chatUsers = document.querySelectorAll(".chat-user");
const emptyChat = document.getElementById("emptyChat");
const chatArea = document.getElementById("chatArea");
const chatName = document.getElementById("chatName");
let currentChatUserId = null;
let otherUserOnline = false;

chatUsers.forEach(user => {
    user.addEventListener("click", async () => {

        const userId = user.dataset.userId;
        const name = user.querySelector("strong").textContent;

        await openChat(userId, name);
    });
});

async function openChat(userId, name) {
    currentChatUserId = userId;

    socket.emit("presenceCheck", userId);

    console.log("OPENING CHAT FOR:", userId);

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

    if (currentConversationId) {
        socket.emit("leaveConversation", currentConversationId);
    }

    currentConversationId = newConversationId;

    socket.emit("joinConversation", currentConversationId);

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

    let user = document.querySelector(`.chat-user[data-user-id="${userId}"]`)

    if (!user) {
        user = document.createElement("div");

        user.classList.add("p-3", "border-bottom", "chat-user");

        user.dataset.userId = userId;
        user.dataset.conversationId = currentConversationId;

        const userName = document.createElement("strong");
        userName.textContent = name;

        user.appendChild(userName);

        chatUsersContainer.appendChild(user);

        user.addEventListener("click", async () => {
            await openChat(userId, name);
        });
    }

    const unread_Badge = user.querySelector(".unread-badge");

    if (unread_Badge) {
        unread_Badge.remove();
    }

    socket.emit("messagesRead", currentConversationId);

    emptyChat.classList.add("d-none");

    chatArea.classList.remove("d-none");
    chatArea.classList.add("d-flex");

    chatName.textContent = name;

    requestAnimationFrame(() => {
        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;
    });
}

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

searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim();

    if (!query) {
        searchResults.innerHTML = "";
        return;
    }

    const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`
    );

    const searchedUsers = await response.json();

    searchResults.innerHTML = "";

    searchedUsers.forEach(user=>{
        const userElement = document.createElement("div");
        userElement.classList.add("search-user");

        const content = document.createElement("div");
        content.classList.add("search-user-content");

        const userInfo = document.createElement("div");
        userInfo.classList.add("search-user-info");

        const userName = document.createElement("div");
        userName.classList.add("search-user-name");
        userName.textContent = user.name;

        const userUsername = document.createElement("div");
        userUsername.classList.add("search-user-username");
        userUsername.textContent = `@${user.username}`;

        const arrow = document.createElement("div");
        arrow.classList.add("search-arrow");

        const icon = document.createElement("i");
        icon.classList.add("bi", "bi-arrow-up-right");

        userInfo.appendChild(userName);
        userInfo.appendChild(userUsername);

        arrow.appendChild(icon);

        content.appendChild(userInfo);
        content.appendChild(arrow);

        userElement.appendChild(content);

        userElement.dataset.userId = user._id;

        searchResults.appendChild(userElement);

        userElement.addEventListener("click", async () => {
            await openChat(user._id, user.name);

            searchInput.value = "";
            searchResults.innerHTML = "";
        });
    });
});

logoutForm.addEventListener("submit", ()=>{
    socket.disconnect();
})

function appendImage(messageElement, imageUrl) {
    const imageElement = document.createElement("img");

    imageElement.src = imageUrl;
    imageElement.alt = "Shared image";
    imageElement.classList.add("img-fluid", "rounded");

    imageElement.style.maxWidth = "250px";
    imageElement.style.maxHeight = "250px";
    imageElement.style.objectFit = "contain";
    imageElement.style.cursor = "pointer";

    imageElement.addEventListener("click", () => {
        openImageModal(imageElement.src);
    });

    messageElement.appendChild(imageElement);
}

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

    if (message.type === "image" && message.imageUrl) {
        appendImage(messageElement, message.imageUrl);
    } else {
        messageElement.textContent = message.text || "";
    }

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

//Image Modal

function openImageModal(imageUrl) {
    enlargedImage.src = imageUrl;
    imageModal.classList.remove("d-none");
}

function closeImageModalView() {
    imageModal.classList.add("d-none");
    enlargedImage.src = "";
}

closeImageModal.addEventListener("click", closeImageModalView);

imageModal.addEventListener("click", (event) => {
    if (event.target === imageModal) {
        closeImageModalView();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !imageModal.classList.contains("d-none")) {
        closeImageModalView();
    }
});

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

socket.on("newMessageNotification", (data) => {

    if (data.conversationId === currentConversationId) {
        return;
    }

    increaseUnreadCount(data.conversationId);
    socket.emit("messageDelivered", data.messageId);

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