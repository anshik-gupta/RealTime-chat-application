import Conversation from "../models/conversationModel.js";
import Message from "../models/messagesModel.js";

const getMessages = async (req, res, next) => {
    try{
        const currentUser = req.userId;
        const conversationId = req.params.conversationId;
        const before = req.query.before;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUser
        });

        if(!conversation){
            return res.status(400).json({
                message: "conversation not found"
            });
        }

        let query = {
            conversation: conversationId
        };

        if(before){
            const cursorMessage = await Message.findOne({
                _id: before,
                conversation: conversationId
            });

            if(!cursorMessage){
                return res.status(400).json({
                    message: "invalid cursor"
                });
            }

            query.createdAt = {
                $lt: cursorMessage.createdAt
            };
        }

        const messages = await Message.find(query)
            .populate("sender", "name")
            .sort({ createdAt: -1 })
            .limit(20);

        messages.reverse();

        const hasMore = messages.length === 20;

        const nextCursor = messages.length > 0 ? messages[0]._id : null;

        return res.json({
            messages,
            hasMore,
            nextCursor
        });

    }catch(error){
        console.log(error);

        return res.status(500).json({
            message: "error occured in finding messages"
        });
    }
}

export default getMessages;