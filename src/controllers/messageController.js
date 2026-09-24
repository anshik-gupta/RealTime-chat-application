import Conversation from "../models/conversationModel.js";
import Message from "../models/messagesModel.js";

const getMessages = async (req, res, next) => {
    try{
        const currentUser = req.userId;
        const conversationId = req.params.conversationId;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUser
        });

        if(!conversation){
            return res.status(400).json({
                message: "conversation not found"
            });
        }

        const messages = await Message.find({
            conversation: conversationId
        })
            .populate("sender", "username")
            .sort({createdAt : 1});

        return res.json({
            messages
        });

    }catch(error){
        console.log(error);

        return res.status(500).json({
            message: "error occured in finding messages"
        });
    }
}

export default getMessages;