const chatService = require('../services/chatService');
const logger = require('../config/logger');

module.exports = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            socket.userId = socket.handshake.auth.userId;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`User connected: ${socket.userId}`);

        socket.join(socket.userId);

        // Chat events
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conv_${conversationId}`);
            logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conv_${conversationId}`);
            logger.info(`User ${socket.userId} left conversation ${conversationId}`);
        });

        socket.on('send_message', async (data, callback) => {
            try {
                const { conversationId, receiverId, text, image, voice } = data;

                const message = await chatService.sendMessage(
                    conversationId,
                    socket.userId,
                    receiverId,
                    { text, image, voice }
                );

                await message.populate('sender', 'name profilePicture');

                io.to(`conv_${conversationId}`).emit('receive_message', message);
                io.to(receiverId).emit('new_message_notification', {
                    conversationId,
                    message: message.toObject()
                });

                if (callback) callback({ success: true, message });
            } catch (error) {
                logger.error('Socket send_message error:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        socket.on('send_voice_message', async (data, callback) => {
            try {
                const { conversationId, receiverId, voiceUrl, duration } = data;

                const message = await chatService.sendVoiceMessage(
                    conversationId,
                    socket.userId,
                    receiverId,
                    { voiceUrl, duration }
                );

                await message.populate('sender', 'name profilePicture');

                io.to(`conv_${conversationId}`).emit('receive_voice_message', {
                    message,
                    duration
                });

                io.to(receiverId).emit('new_voice_notification', {
                    conversationId,
                    from: socket.userId,
                    duration
                });

                if (callback) callback({ success: true, message });
            } catch (error) {
                logger.error('Socket send_voice_message error:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        socket.on('typing', (data) => {
            const { conversationId, isTyping } = data;
            socket.to(`conv_${conversationId}`).emit('user_typing', {
                userId: socket.userId,
                isTyping
            });
        });

        socket.on('mark_read', async (conversationId) => {
            try {
                await chatService.markAsRead(conversationId, socket.userId);
                socket.to(`conv_${conversationId}`).emit('messages_read', {
                    by: socket.userId,
                    conversationId
                });
            } catch (error) {
                logger.error('Socket mark_read error:', error);
            }
        });

        // Video call events
        socket.on('video_call_offer', (data) => {
            const { receiverId, offer, isVideo } = data;
            logger.info(`Video call offer from ${socket.userId} to ${receiverId}`);
            io.to(receiverId).emit('incoming_video_call', {
                from: socket.userId,
                offer,
                isVideo: isVideo !== false
            });
        });

        socket.on('video_call_answer', (data) => {
            const { callerId, answer } = data;
            logger.info(`Video call answered by ${socket.userId}`);
            io.to(callerId).emit('video_call_answered', {
                answer,
                by: socket.userId
            });
        });

        socket.on('ice_candidate', (data) => {
            const { receiverId, candidate } = data;
            io.to(receiverId).emit('ice_candidate', {
                from: socket.userId,
                candidate
            });
        });

        socket.on('end_call', (data) => {
            const { receiverId } = data;
            logger.info(`Call ended by ${socket.userId}`);
            io.to(receiverId).emit('call_ended', {
                by: socket.userId
            });
        });

        socket.on('reject_call', (data) => {
            const { callerId, reason } = data;
            logger.info(`Call rejected by ${socket.userId}`);
            io.to(callerId).emit('call_rejected', {
                by: socket.userId,
                reason: reason || 'User rejected the call'
            });
        });

        socket.on('toggle_audio', (data) => {
            const { receiverId, isMuted } = data;
            io.to(receiverId).emit('peer_audio_toggled', { isMuted });
        });

        socket.on('toggle_video', (data) => {
            const { receiverId, isVideoOff } = data;
            io.to(receiverId).emit('peer_video_toggled', { isVideoOff });
        });

        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${socket.userId}`);
        });
    });
};