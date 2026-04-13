const chatService = require('../services/chatService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

const createMessageNotification = async ({ recipient, actor, actorName, conversationId, messageId }) => {
    const notification = await Notification.create({
        recipient,
        actor,
        type: 'message',
        message: `${actorName} sent you a message`,
        metadata: { conversationId, messageId }
    });

    try {
        const io = getIO();
        io.to(recipient.toString()).emit('notification_created', {
            notification
        });
    } catch (err) {
        logger.warn(`Failed to emit message notification: ${err.message}`);
    }
};

exports.startConversation = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    const conversation = await chatService.getOrCreateConversation(
        req.user.id,
        userId
    );

    logger.info(`Conversation started between ${req.user.id} and ${userId}`);

    res.status(200).json({
        status: 'success',
        data: { conversation }
    });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
    const { conversationId, receiverId, text, image, voice } = req.body;

    if (!conversationId || !receiverId) {
        return res.status(400).json({
            status: 'fail',
            message: 'conversationId and receiverId are required'
        });
    }

    logger.info(`HTTP message from ${req.user.id} to ${receiverId}`);

    const message = await chatService.sendMessage(
        conversationId,
        req.user.id,
        receiverId,
        { text, image, voice }
    );

    await message.populate('sender', 'name profilePicture');

    logger.info(`Message sent: ${message._id}`);

    await createMessageNotification({
        recipient: receiverId,
        actor: req.user.id,
        actorName: req.user.name,
        conversationId,
        messageId: message._id
    });

    res.status(201).json({
        status: 'success',
        data: { message }
    });
});

exports.sendFileMessage = catchAsync(async (req, res, next) => {
    const { conversationId, receiverId, text } = req.body;
    const file = req.file;

    if (!conversationId || !receiverId) {
        return res.status(400).json({
            status: 'fail',
            message: 'conversationId and receiverId are required'
        });
    }

    if (!file) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please upload a file'
        });
    }

    const mimeType = file.mimetype || '';
    const attachmentType = mimeType.startsWith('image/')
        ? 'image'
        : mimeType.startsWith('video/')
            ? 'video'
            : 'document';

    const message = await chatService.sendMessage(
        conversationId,
        req.user.id,
        receiverId,
        {
            text,
            attachmentUrl: file.path,
            attachmentType,
            attachmentName: file.originalname,
            attachmentSize: file.size
        }
    );

    await message.populate('sender', 'name profilePicture');
    await message.populate('reactions.user', 'name profilePicture');

    await createMessageNotification({
        recipient: receiverId,
        actor: req.user.id,
        actorName: req.user.name,
        conversationId,
        messageId: message._id
    });

    res.status(201).json({
        status: 'success',
        data: { message }
    });
});


exports.getMessages = catchAsync(async (req, res, next) => {
    const { conversationId } = req.params;

    const messages = await chatService.getMessages(
        conversationId,
        req.user.id,
        req.query
    );

    res.status(200).json({
        status: 'success',
        results: messages.length,
        data: { messages }
    });
});


exports.getMyConversations = catchAsync(async (req, res, next) => {
    const conversations = await chatService.getMyConversations(req.user.id);

    res.status(200).json({
        status: 'success',
        results: conversations.length,
        data: { conversations }
    });
});


exports.markAsRead = catchAsync(async (req, res, next) => {
    const { conversationId } = req.params;

    await chatService.markAsRead(conversationId, req.user.id);

    res.status(200).json({
        status: 'success',
        message: 'Messages marked as read'
    });
});


exports.getUnreadCount = catchAsync(async (req, res, next) => {
    const count = await chatService.getUnreadCount(req.user.id);

    res.status(200).json({
        status: 'success',
        data: { unreadCount: count }
    });
});

exports.editMessage = catchAsync(async (req, res, next) => {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await chatService.editMessage(messageId, req.user.id, text);

    res.status(200).json({
        status: 'success',
        data: { message }
    });
});

exports.reactToMessage = catchAsync(async (req, res, next) => {
    const { messageId } = req.params;
    const { sticker } = req.body;

    const message = await chatService.reactToMessage(messageId, req.user.id, sticker);

    res.status(200).json({
        status: 'success',
        data: { message }
    });
});