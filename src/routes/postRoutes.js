const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const { uploadGallery } = require('../config/cloudinary');

router.use(protect);


router.get('/feed', postController.getFeed);

router.get('/my-posts', postController.getMyPosts);


router.get('/user/:userId', postController.getUserPosts);


router.post('/create', uploadGallery.array('images', 5), postController.createPost);
router.get('/:postId', postController.getPost);
router.delete('/:postId', postController.deletePost);

router.post('/:postId/like', postController.likePost);
router.delete('/:postId/unlike', postController.unlikePost);

router.post('/:postId/comment', postController.addComment);
router.delete('/:postId/comment/:commentId', postController.deleteComment);

module.exports = router;