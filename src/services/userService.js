const User = require('../models/User');
const AppError = require('../utils/AppError');

exports.getMe = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
};

exports.getUser = async (userId) => {
    const user = await User.findById(userId).select('-email -isActive -isVerified -verificationToken -passwordResetToken -passwordResetExpires');
    if (!user) throw new AppError('User not found', 404);
    return user;
};

exports.updateProfile = async (userId, updateData) => {
    const allowedFields = ['name', 'bio', 'age', 'gender', 'interests', 'location'];
    const filteredData = {};

    Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
            filteredData[key] = updateData[key];
        }
    });

    const user = await User.findByIdAndUpdate(
        userId,
        filteredData,
        { new: true, runValidators: true }
    );

    if (!user) throw new AppError('User not found', 404);
    return user;
};

exports.updateProfilePicture = async (userId, imageUrl) => {
    const user = await User.findByIdAndUpdate(
        userId,
        { profilePicture: imageUrl },
        { new: true }
    );
    if (!user) throw new AppError('User not found', 404);
    return user;
};

exports.addGalleryImage = async (userId, imageUrl) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (user.galleryImages.length >= 6) {
        throw new AppError('Maximum 6 gallery images allowed', 400);
    }

    user.galleryImages.push(imageUrl);
    await user.save({ validateBeforeSave: false });
    return user;
};

exports.removeGalleryImage = async (userId, imageUrl) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.galleryImages = user.galleryImages.filter(img => img !== imageUrl);
    await user.save({ validateBeforeSave: false });
    return user;
};

exports.discoverUsers = async (currentUserId, query) => {
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) throw new AppError('User not found', 404);

    const { minAge = 18, maxAge = 100, gender, limit = 20, page = 1 } = query;

    // Build match criteria - removed isActive filter since it has select: false
    const matchCriteria = {
        _id: { $ne: currentUserId },
        age: { $gte: parseInt(minAge), $lte: parseInt(maxAge) }
    };

    if (gender && gender !== 'all') {
        matchCriteria.gender = gender;
    }

    const users = await User.find(matchCriteria)
        .select('name age gender bio profilePicture interests location lastActive')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    return users;
};