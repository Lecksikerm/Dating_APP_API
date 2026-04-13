const logger = require('../config/logger');

module.exports = (io) => {
    io.on('connection', (socket) => {

        // User initiates video call
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

        // Reject call
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

            io.to(receiverId).emit('peer_audio_toggled', {
                isMuted
            });
        });

        // Enable/disable video
        socket.on('toggle_video', (data) => {
            const { receiverId, isVideoOff } = data;

            io.to(receiverId).emit('peer_video_toggled', {
                isVideoOff
            });
        });
    });
};
