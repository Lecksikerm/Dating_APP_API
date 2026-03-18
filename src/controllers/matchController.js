const matchService = require('../services/matchService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');

exports.likeUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    logger.info(`User ${req.user.id} liking user ${userId}`);

    const result = await matchService.likeUser(req.user.id, userId);

    const message = result.isMatch
        ? "It's a match! You both liked each other."
        : "User liked successfully";

    logger.info(`Like result: ${result.isMatch ? 'MATCH' : 'LIKE'} - User: ${userId}`);

    res.status(200).json({
        status: 'success',
        message,
        data: {
            isMatch: result.isMatch,
            like: result.like
        }
    });
});

exports.passUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    logger.info(`User ${req.user.id} passing user ${userId}`);

    const result = await matchService.passUser(req.user.id, userId);

    res.status(200).json({
        status: 'success',
        message: result.message
    });
});

exports.getMyMatches = catchAsync(async (req, res, next) => {
    logger.info(`Getting matches for user ${req.user.id}`);

    const matches = await matchService.getMyMatches(req.user.id);

    res.status(200).json({
        status: 'success',
        results: matches.length,
        data: { matches }
    });
});

exports.getWhoLikedMe = catchAsync(async (req, res, next) => {
    logger.info(`Getting who liked user ${req.user.id}`);

    const likes = await matchService.getWhoLikedMe(req.user.id);

    res.status(200).json({
        status: 'success',
        results: likes.length,
        data: { likes }
    });
});

exports.getPeopleILiked = catchAsync(async (req, res, next) => {
    logger.info(`Getting people liked by user ${req.user.id}`);

    const likes = await matchService.getPeopleILiked(req.user.id);

    res.status(200).json({
        status: 'success',
        results: likes.length,
        data: { likes }
    });
});

exports.unlikeUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    logger.info(`User ${req.user.id} unliking user ${userId}`);

    const result = await matchService.unlikeUser(req.user.id, userId);

    res.status(200).json({
        status: 'success',
        message: result.message
    });
});