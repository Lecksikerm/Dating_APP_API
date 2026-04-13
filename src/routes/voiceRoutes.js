const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { protect } = require('../middleware/auth');
const { uploadVoice } = require('../config/cloudinary');

router.use(protect);

router.post(
    '/upload',
    uploadVoice.fields([
        { name: 'voice', maxCount: 1 },
        { name: 'conversationId', maxCount: 1 },
        { name: 'receiverId', maxCount: 1 },
        { name: 'duration', maxCount: 1 },
    ]),
    voiceController.uploadVoiceMessage
);

router.get('/:messageId', voiceController.getVoiceMessage);

module.exports = router;