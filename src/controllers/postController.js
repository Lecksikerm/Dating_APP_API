const postService = require('../services/postService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');

exports.createPost = catchAsync(async (req, res, next) => {
    logger.info(`Creating post for user: ${req.user.id}`);

    const images = Array.isArray(req.files) && req.files.length > 0
        ? req.files.map(file => file.path)
        : [];

    const postData = {
        text: req.body.text?.trim() || '',
        images,
        video: req.body.video || null
    };

    const post = await postService.createPost(req.user.id, postData);

    logger.info(`Post created: ${post._id}`);

    res.status(201).json({
        status: 'success',
        data: { post }
    });
});

exports.getFeed = catchAsync(async (req, res, next) => {
    const posts = await postService.getFeed(req.user.id, req.query);

    res.status(200).json({
        status: 'success',
        results: posts.length,
        data: { posts }
    });
});

exports.getMyPosts = catchAsync(async (req, res, next) => {
    const posts = await postService.getMyPosts(req.user.id, req.query);

    res.status(200).json({
        status: 'success',
        results: posts.length,
        data: { posts }
    });
});

exports.getUserPosts = catchAsync(async (req, res, next) => {
    const posts = await postService.getUserPosts(
        req.user.id,
        req.params.userId,
        req.query
    );

    res.status(200).json({
        status: 'success',
        results: posts.length,
        data: { posts }
    });
});

exports.getPost = catchAsync(async (req, res, next) => {
    const post = await postService.getPost(req.params.postId, req.user.id);

    res.status(200).json({
        status: 'success',
        data: { post }
    });
});

exports.likePost = catchAsync(async (req, res, next) => {
    logger.info(`User ${req.user.id} liking post ${req.params.postId}`);

    const post = await postService.likePost(req.params.postId, req.user.id);

    res.status(200).json({
        status: 'success',
        message: 'Post liked',
        data: { likesCount: post.likesCount }
    });
});

exports.unlikePost = catchAsync(async (req, res, next) => {
    logger.info(`User ${req.user.id} unliking post ${req.params.postId}`);

    const post = await postService.unlikePost(req.params.postId, req.user.id);

    res.status(200).json({
        status: 'success',
        message: 'Post unliked',
        data: { likesCount: post.likesCount }
    });
});

exports.addComment = catchAsync(async (req, res, next) => {
    const { text } = req.body;

    logger.info(`User ${req.user.id} commenting on post ${req.params.postId}`);

    const post = await postService.addComment(req.params.postId, req.user.id, text);

    res.status(201).json({
        status: 'success',
        data: { post }
    });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
    const { postId, commentId } = req.params;

    logger.info(`Deleting comment ${commentId} from post ${postId}`);

    const post = await postService.deleteComment(postId, commentId, req.user.id);

    res.status(200).json({
        status: 'success',
        data: { post }
    });
});

exports.deletePost = catchAsync(async (req, res, next) => {
    logger.info(`User ${req.user.id} deleting post ${req.params.postId}`);

    await postService.deletePost(req.params.postId, req.user.id);

    res.status(200).json({
        status: 'success',
        message: 'Post deleted successfully'
    });
});