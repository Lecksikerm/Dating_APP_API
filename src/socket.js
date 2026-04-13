const jwt = require('jsonwebtoken');
const User = require('./models/User');
const logger = require('./config/logger');

let io;

const initSocket = (socketIO) => {
    io = socketIO;

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (err) {
            logger.error('Socket auth error:', err.message);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`User connected: ${socket.userId}`);

        // Join personal room
        socket.join(socket.userId);

        User.findByIdAndUpdate(
            socket.userId,
            { onlineStatus: true, lastActive: Date.now() },
            { new: true }
        ).catch((err) => logger.error('Failed to update online presence:', err.message));

        io.emit('presence_update', {
            userId: socket.userId,
            onlineStatus: true,
            lastActive: new Date().toISOString()
        });

        // Handle joining conversation
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
        });

        // Handle leaving conversation
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(conversationId);
        });

        // Handle new message
        socket.on('send_message', async (data) => {
            const { conversationId, receiverId, text } = data;

            try {
                const chatService = require('./services/chatService');

                const message = await chatService.sendMessage(
                    conversationId,
                    socket.userId,
                    receiverId,
                    { text }
                );

                await message.populate('sender', 'name profilePicture');

                // Broadcast to conversation room
                io.to(conversationId).emit('new_message', {
                    message,
                    conversationId
                });

                // Notify receiver
                io.to(receiverId).emit('notification', {
                    type: 'new_message',
                    conversationId,
                    message
                });

            } catch (err) {
                logger.error('Socket send message error:', err);
                socket.emit('error', { message: err.message });
            }
        });

        // Handle typing
        socket.on('typing', (data) => {
            socket.to(data.conversationId).emit('user_typing', {
                userId: socket.userId,
                conversationId: data.conversationId
            });
        });

        socket.on('stop_typing', (data) => {
            socket.to(data.conversationId).emit('user_stop_typing', {
                userId: socket.userId,
                conversationId: data.conversationId
            });
        });

        socket.on('recording_start', (data) => {
            socket.to(data.conversationId).emit('user_recording', {
                userId: socket.userId,
                conversationId: data.conversationId,
                isRecording: true
            });
        });

        socket.on('recording_stop', (data) => {
            socket.to(data.conversationId).emit('user_recording', {
                userId: socket.userId,
                conversationId: data.conversationId,
                isRecording: false
            });
        });

        socket.on('call_offer', (data) => {
            const { receiverId, offer, mode = 'audio' } = data;
            io.to(receiverId).emit('incoming_call', {
                callerId: socket.userId,
                offer,
                mode
            });
        });

        socket.on('call_answer', (data) => {
            const { callerId, answer } = data;
            io.to(callerId).emit('call_answered', {
                answer,
                receiverId: socket.userId
            });
        });

        socket.on('call_ice_candidate', (data) => {
            const { receiverId, candidate } = data;
            io.to(receiverId).emit('call_ice_candidate', {
                candidate,
                fromUserId: socket.userId
            });
        });

        socket.on('end_call', (data) => {
            const { receiverId } = data;
            io.to(receiverId).emit('call_ended', {
                fromUserId: socket.userId
            });
        });

        socket.on('switch_call_mode', (data) => {
            const { receiverId, mode } = data;
            io.to(receiverId).emit('call_mode_switched', {
                mode,
                fromUserId: socket.userId
            });
        });

        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${socket.userId}`);
            User.findByIdAndUpdate(
                socket.userId,
                { onlineStatus: false, lastActive: Date.now() },
                { new: true }
            ).catch((err) => logger.error('Failed to update offline presence:', err.message));

            io.emit('presence_update', {
                userId: socket.userId,
                onlineStatus: false,
                lastActive: new Date().toISOString()
            });
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

module.exports = { initSocket, getIO };