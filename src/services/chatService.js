const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Like = require('../models/Like');
const User = require('../models/User');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const chatService = {
    getOrCreateConversation: async (userId1, userId2) => {
        if (!userId2) {
            throw new AppError('User is required to start a conversation', 400);
        }

        if (userId1.toString() === userId2.toString()) {
            throw new AppError('You cannot start a conversation with yourself', 400);
        }

        const [sender, receiver] = await Promise.all([
            User.findById(userId1).select('_id'),
            User.findById(userId2).select('_id')
        ]);

        if (!sender || !receiver) {
            throw new AppError('User not found', 404);
        }

        const isMatched = await Like.exists({
            $or: [
                { fromUser: userId1, toUser: userId2, isMatch: true },
                { fromUser: userId2, toUser: userId1, isMatch: true }
            ]
        });

        if (!isMatched) {
            throw new AppError('You can only chat with your matches', 403);
        }

        const sortedParticipants = [userId1.toString(), userId2.toString()].sort();
        const participantsHash = sortedParticipants.join('_');

        const conversation = await Conversation.findOneAndUpdate(
            { participantsHash },
            {
                $setOnInsert: {
                    participants: sortedParticipants,
                    participantsHash
                }
            },
            { new: true, upsert: true }
        );

        return conversation;
    },

    sendMessage: async (conversationId, senderId, receiverId, messageData) => {
        const {
            text,
            image,
            voice,
            duration,
            attachmentUrl,
            attachmentType,
            attachmentName,
            attachmentSize
        } = messageData;

        if (!text && !image && !voice && !attachmentUrl) {
            throw new AppError('Message must have text, image, voice, or file attachment', 400);
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        const hasSender = conversation.participants.some(
            (participantId) => participantId.toString() === senderId.toString()
        );
        const hasReceiver = conversation.participants.some(
            (participantId) => participantId.toString() === receiverId.toString()
        );

        if (!hasSender || !hasReceiver) {
            throw new AppError('Conversation participants are invalid', 403);
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: senderId,
            receiver: receiverId,
            text,
            image,
            voice,
            duration,
            attachmentUrl,
            attachmentType,
            attachmentName,
            attachmentSize
        });

        const messagePreview = text
            || (attachmentType === 'image' ? 'Sent an image' : '')
            || (attachmentType === 'video' ? 'Sent a video' : '')
            || (attachmentType === 'document' ? 'Sent a document' : '')
            || (image ? 'Sent an image' : '')
            || (voice ? 'Sent a voice message' : '')
            || 'Sent an attachment';

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            lastMessageText: messagePreview,
            lastMessageAt: Date.now()
        });

        return message;
    },

    editMessage: async (messageId, userId, text) => {
        const trimmedText = text?.trim();
        if (!trimmedText) {
            throw new AppError('Message text is required', 400);
        }

        const message = await Message.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            throw new AppError('Message not found or access denied', 404);
        }

        message.text = trimmedText;
        message.isEdited = true;
        message.editedAt = Date.now();
        await message.save({ validateBeforeSave: false });

        await Conversation.findOneAndUpdate(
            {
                _id: message.conversation,
                lastMessage: message._id
            },
            {
                lastMessageText: trimmedText
            }
        );

        await message.populate('sender', 'name profilePicture');
        await message.populate('reactions.user', 'name profilePicture');

        return message;
    },

    reactToMessage: async (messageId, userId, sticker) => {
        const message = await Message.findOne({
            _id: messageId,
            $or: [{ sender: userId }, { receiver: userId }]
        }).populate('sender', 'name profilePicture');

        if (!message) {
            throw new AppError('Message not found or access denied', 404);
        }

        const existingReactionIndex = message.reactions.findIndex(
            (reaction) => reaction.user.toString() === userId.toString()
        );

        const trimmedSticker = sticker?.trim();

        if (!trimmedSticker) {
            if (existingReactionIndex !== -1) {
                message.reactions.splice(existingReactionIndex, 1);
            }
        } else if (existingReactionIndex === -1) {
            message.reactions.push({
                user: userId,
                sticker: trimmedSticker,
                reactedAt: Date.now()
            });
        } else {
            message.reactions[existingReactionIndex].sticker = trimmedSticker;
            message.reactions[existingReactionIndex].reactedAt = Date.now();
        }

        await message.save({ validateBeforeSave: false });
        await message.populate('reactions.user', 'name profilePicture');

        return message;
    },

    getMessages: async (conversationId, userId, query = {}) => {
        const { limit = 50, page = 1 } = query;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });

        if (!conversation) {
            throw new AppError('Conversation not found or access denied', 404);
        }

        await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                isDelivered: { $ne: true }
            },
            {
                isDelivered: true,
                deliveredAt: Date.now()
            }
        );

        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'name profilePicture')
            .populate('reactions.user', 'name profilePicture')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        return messages.reverse();
    },

    getMyConversations: async (userId) => {
        await Message.updateMany(
            {
                receiver: userId,
                isDelivered: { $ne: true }
            },
            {
                isDelivered: true,
                deliveredAt: Date.now()
            }
        );

        const conversations = await Conversation.find({
            participants: userId
        })
            .populate('participants', 'name profilePicture onlineStatus lastActive')
            .populate('lastMessage', 'text isRead createdAt')
            .sort({ lastMessageAt: -1 });

        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    receiver: new mongoose.Types.ObjectId(userId),
                    isRead: false
                }
            },
            {
                $group: {
                    _id: '$conversation',
                    unreadCount: { $sum: 1 }
                }
            }
        ]);

        const unreadCountMap = new Map(
            unreadCounts.map((item) => [item._id.toString(), item.unreadCount])
        );

        return conversations.map(conv => {
            const otherUser = conv.participants.find(
                p => p._id.toString() !== userId.toString()
            );
            return {
                _id: conv._id,
                participants: conv.participants,
                user: otherUser,
                lastMessage: conv.lastMessageText,
                lastMessageAt: conv.lastMessageAt,
                unreadCount: unreadCountMap.get(conv._id.toString()) || 0
            };
        });
    },

    markAsRead: async (conversationId, userId) => {
        await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                isRead: false
            },
            {
                isDelivered: true,
                deliveredAt: Date.now(),
                isRead: true,
                readAt: Date.now()
            }
        );

        return { message: 'Messages marked as read' };
    },

    getUnreadCount: async (userId) => {
        const count = await Message.countDocuments({
            receiver: userId,
            isRead: false
        });

        return count;
    },

    getMessageById: async (messageId, userId) => {
        const message = await Message.findOne({
            _id: messageId,
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        });

        if (!message) {
            throw new AppError('Message not found or access denied', 404);
        }

        return message;
    },

    sendVoiceMessage: async (conversationId, senderId, receiverId, voiceData) => {
        const { voiceUrl, duration } = voiceData;

        if (!voiceUrl) {
            throw new AppError('Voice URL is required', 400);
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: senderId,
            receiver: receiverId,
            voice: voiceUrl,
            text: `🎤 Voice message (${duration || '0:00'})`
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            lastMessageText: '🎤 Voice message',
            lastMessageAt: Date.now()
        });

        return message;
    }
};

module.exports = chatService;