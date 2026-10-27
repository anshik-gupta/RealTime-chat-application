<div align="center">

# 💬 Chattr

### Real-Time Chat Application

A real-time messaging application built with Node.js, Express, Socket.IO, and MongoDB.

[🚀 Live Demo](https://chattr-ovrp.onrender.com/) · [📂 Repository](https://github.com/anshik-gupta/RealTime-chat-application)

</div>

---

## 📌 About the Project

Chattr is a real-time chat application designed to provide users with a responsive messaging experience. It supports instant communication, message history, online presence, and image sharing.

This project is an ongoing learning project focused on understanding real-time communication, backend development, authentication, database integration, and deployment.

## ✨ Features

- 🔐 User authentication
- 💬 Real-time one-to-one messaging
- 🖼️ Image sharing using Cloudinary
- ✓ Sent, delivered, and read message statuses
- ⌨️ Typing indicators
- 🟢 Online/offline presence
- 🔔 Unread message counts and notifications
- 📜 Message history with pagination
- 🔎 User search and conversation creation
- 📱 Responsive chat interface

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend web framework |
| Socket.IO | Real-time communication |
| MongoDB | Database |
| Mongoose | MongoDB object modeling |
| EJS | Server-rendered templates |
| Bootstrap | UI styling |
| JavaScript | Client-side functionality |
| Cloudinary | Image storage |
| Render | Application deployment |

## 🏗️ Architecture Overview

The application uses a client-server architecture.

- **Frontend:** EJS templates, HTML, CSS, Bootstrap, and JavaScript.
- **Backend:** Node.js and Express handle HTTP requests and application logic.
- **Real-time communication:** Socket.IO delivers messages and events to connected users.
- **Database:** MongoDB stores user, conversation, and message data.
- **Image storage:** Cloudinary stores uploaded images.
- **Deployment:** Render hosts the application.

## 🚀 Live Demo

Try the deployed application:

**[Open Chattr](https://chattr-ovrp.onrender.com/)**

> Note: The application is deployed on Render's free service, so the first request after inactivity may take some time.

## ⚙️ Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/anshik-gupta/RealTime-chat-application.git
```

### 2. Navigate into the project

```bash
cd RealTime-chat-application
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Replace the example values with your own credentials.

**Never commit your `.env` file or expose your API secrets.**

### 5. Start the application

For development:

```bash
npm run dev
```

For a regular start:

```bash
npm start
```

Open the local address shown in your terminal, typically:

http://localhost:3000

## 🗺️ Future Improvements

- 🗑️ Message deletion
- 🎨 Additional UI and usability improvements
- 🧪 Further testing and reliability improvements

## 👨‍💻 Author

**Anshik Kumar Gupta**

- GitHub: [@anshik-gupta](https://github.com/anshik-gupta)

---

<div align="center">

Built as a hands-on project to learn backend development and real-time communication.

</div>
