const chatSocket = require('./chatSocket');
const videoSocket = require('./videoSocket');

module.exports = (io) => {
    // Chat functionality
    chatSocket(io);

    // Video call functionality
    videoSocket(io);
};