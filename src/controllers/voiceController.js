const chatService = require('../services/chatService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// Upload voice message
exports.uploadVoiceMessage = catchAsync(async (req, res, next) => {
    // Handle file from multer.fields()
    const voiceFile = req.files?.voice?.[0];

    if (!voiceFile) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please upload a voice message'
        });
    }

    const conversationId = Array.isArray(req.body.conversationId)
        ? req.body.conversationId[0]
        : req.body.conversationId;

    const receiverId = Array.isArray(req.body.receiverId)
        ? req.body.receiverId[0]
        : req.body.receiverId;

    const duration = Array.isArray(req.body.duration)
        ? req.body.duration[0]
        : req.body.duration;


    if (!conversationId || !receiverId) {
        return res.status(400).json({
            status: 'fail',
            message: 'conversationId and receiverId are required'
        });
    }

    logger.info(`Voice message upload from ${req.user.id} to ${receiverId}`);

    const voiceUrl = voiceFile.path;

    const message = await chatService.sendMessage(
        conversationId,
        req.user.id,
        receiverId,
        {
            voice: voiceUrl,
            duration,
            text: `🎤 Voice message (${duration || '0:00'})`
        }
    );

    await message.populate('sender', 'name profilePicture');

    logger.info(`Voice message sent: ${message._id}`);

    const notification = await Notification.create({
        recipient: receiverId,
        actor: req.user.id,
        type: 'message',
        message: `${req.user.name} sent you a voice message`,
        metadata: { conversationId, messageId: message._id }
    });

    try {
        const io = getIO();
        io.to(receiverId.toString()).emit('notification_created', {
            notification
        });
    } catch (err) {
        logger.warn(`Failed to emit voice notification: ${err.message}`);
    }

    res.status(201).json({
        status: 'success',
        data: { message }
    });
});


exports.getVoiceMessage = catchAsync(async (req, res, next) => {
    const { messageId } = req.params;

    const message = await chatService.getMessageById(messageId, req.user.id);

    if (!message.voice) {
        return res.status(404).json({
            status: 'fail',
            message: 'No voice message found'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            voiceUrl: message.voice,
            duration: message.duration,
            sentAt: message.createdAt
        }
    });
});