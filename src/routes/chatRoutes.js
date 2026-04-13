const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { uploadChatFile } = require('../config/cloudinary');

router.use(protect);

// Conversations
router.get('/conversations', chatController.getMyConversations);
router.post('/start/:userId', chatController.startConversation);

// Messages
router.post('/send', chatController.sendMessage);
router.post('/send-file', uploadChatFile.single('file'), chatController.sendFileMessage);
router.get('/messages/:conversationId', chatController.getMessages);
router.patch('/read/:conversationId', chatController.markAsRead);
router.get('/unread-count', chatController.getUnreadCount);
router.patch('/messages/:messageId', chatController.editMessage);
router.patch('/messages/:messageId/reaction', chatController.reactToMessage);

module.exports = router;