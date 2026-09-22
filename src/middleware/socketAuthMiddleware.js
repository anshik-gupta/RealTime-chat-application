import jwt from "jsonwebtoken";

const socketAuthMiddleware = (socket, next) => {
    const cookiesHeader = socket.handshake.headers.cookie || "";

    const cookieToken = cookiesHeader.split("; ").find(cookie=> cookie.startsWith("token="));

    const token = cookieToken?.split("=")[1];

    if(!token){
        return next(new Error("Authentication required"));
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
    }
    catch(error){
        return next(new Error("Invalid or expired token"));
    }
}

export default socketAuthMiddleware;