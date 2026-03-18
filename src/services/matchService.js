const Like = require('../models/Like');
const User = require('../models/User');
const AppError = require('../utils/AppError');

exports.likeUser = async (fromUserId, toUserId) => {
    
    if (fromUserId.toString() === toUserId.toString()) {
        throw new AppError('You cannot like yourself', 400);
    }

    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
        throw new AppError('User not found', 404);
    }

    
    const existingLike = await Like.findOne({ fromUser: fromUserId, toUser: toUserId });
    if (existingLike) {
        throw new AppError('You already liked this user', 400);
    }

    const reverseLike = await Like.findOne({ fromUser: toUserId, toUser: fromUserId });
    const isMatch = !!reverseLike;

    const like = await Like.create({
        fromUser: fromUserId,
        toUser: toUserId,
        isMatch
    });

    
    if (isMatch && reverseLike) {
        reverseLike.isMatch = true;
        await reverseLike.save({ validateBeforeSave: false });
    }

    return { like, isMatch };
};

exports.passUser = async (fromUserId, toUserId) => {
   
    if (fromUserId.toString() === toUserId.toString()) {
        throw new AppError('You cannot pass yourself', 400);
    }

    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
        throw new AppError('User not found', 404);
    }

    return { message: 'User passed' };
};

exports.getMyMatches = async (userId) => {
   
    const matches = await Like.find({
        $or: [
            { fromUser: userId, isMatch: true },
            { toUser: userId, isMatch: true }
        ]
    }).populate('fromUser toUser', 'name age gender profilePicture bio');

    const matchedUsers = matches.map(match => {
        const otherUser = match.fromUser._id.toString() === userId.toString()
            ? match.toUser
            : match.fromUser;
        return {
            matchId: match._id,
            user: otherUser,
            matchedAt: match.updatedAt
        };
    });

    return matchedUsers;
};

exports.getWhoLikedMe = async (userId) => {
    
    const likes = await Like.find({
        toUser: userId,
        isMatch: false
    }).populate('fromUser', 'name age gender profilePicture bio');

    return likes.map(like => ({
        likeId: like._id,
        user: like.fromUser,
        likedAt: like.createdAt
    }));
};

exports.getPeopleILiked = async (userId) => {
    
    const likes = await Like.find({
        fromUser: userId,
        isMatch: false
    }).populate('toUser', 'name age gender profilePicture bio');

    return likes.map(like => ({
        likeId: like._id,
        user: like.toUser,
        likedAt: like.createdAt
    }));
};

exports.unlikeUser = async (fromUserId, toUserId) => {
    const like = await Like.findOneAndDelete({ fromUser: fromUserId, toUser: toUserId });

    if (!like) {
        throw new AppError('You have not liked this user', 400);
    }

    if (like.isMatch) {
        const reverseLike = await Like.findOne({ fromUser: toUserId, toUser: fromUserId });
        if (reverseLike) {
            reverseLike.isMatch = false;
            await reverseLike.save({ validateBeforeSave: false });
        }
    }

    return { message: 'User unliked successfully' };
};