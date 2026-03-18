const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Like/Pass/Unlike
router.post('/like/:userId', matchController.likeUser);
router.post('/pass/:userId', matchController.passUser);
router.delete('/unlike/:userId', matchController.unlikeUser);

// Get matches and likes
router.get('/my-matches', matchController.getMyMatches);
router.get('/who-liked-me', matchController.getWhoLikedMe);
router.get('/people-i-liked', matchController.getPeopleILiked);

module.exports = router;