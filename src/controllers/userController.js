const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const { getIO } = require('../socket');
const Notification = require('../models/Notification');

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await userService.getMe(req.user.id);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUser(req.params.id);

  if (req.user?.id && req.user.id.toString() !== req.params.id.toString()) {
    try {
      const dedupeWindowMs = 30 * 60 * 1000; // 30 minutes
      const recentCutoff = new Date(Date.now() - dedupeWindowMs);

      const existingNotification = await Notification.findOne({
        recipient: req.params.id,
        actor: req.user.id,
        type: 'profile_visit',
        createdAt: { $gte: recentCutoff }
      }).sort({ createdAt: -1 });

      if (existingNotification) {
        existingNotification.message = `${req.user.name} visited your profile`;
        existingNotification.metadata = {
          ...(existingNotification.metadata || {}),
          visitorId: req.user.id,
          visitedAt: new Date().toISOString()
        };
        existingNotification.isRead = false;
        existingNotification.readAt = undefined;
        await existingNotification.save({ validateBeforeSave: false });
      } else {
        await Notification.create({
          recipient: req.params.id,
          actor: req.user.id,
          type: 'profile_visit',
          message: `${req.user.name} visited your profile`,
          metadata: {
            visitorId: req.user.id,
            visitedAt: new Date().toISOString()
          }
        });
      }

      const io = getIO();
      io.to(req.params.id).emit('profile_visit_notification', {
        visitorId: req.user.id,
        visitorName: req.user.name,
        visitedAt: new Date().toISOString()
      });
    } catch (err) {
      logger.warn(`Failed to emit profile visit notification: ${err.message}`);
    }
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  logger.info(`Profile update for user: ${req.user.id}`);
  
  const user = await userService.updateProfile(req.user.id, req.body);
  
  logger.info(`Profile updated successfully: ${user._id}`);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.uploadProfilePicture = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ status: 'fail', message: 'Please upload an image' });
  }
  
  logger.info(`Profile picture upload for user: ${req.user.id}`);
  
  const imageUrl = req.file.path;
  const user = await userService.updateProfilePicture(req.user.id, imageUrl);
  
  logger.info(`Profile picture updated: ${user._id}`);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.addGalleryImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ status: 'fail', message: 'Please upload an image' });
  }
  
  logger.info(`Gallery image upload for user: ${req.user.id}`);
  
  const imageUrl = req.file.path;
  const user = await userService.addGalleryImage(req.user.id, imageUrl);
  
  logger.info(`Gallery image added: ${user._id}`);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.removeGalleryImage = catchAsync(async (req, res, next) => {
  const { imageUrl } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({ status: 'fail', message: 'Please provide imageUrl' });
  }
  
  logger.info(`Gallery image removal for user: ${req.user.id}`);
  
  const user = await userService.removeGalleryImage(req.user.id, imageUrl);
  
  logger.info(`Gallery image removed: ${user._id}`);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.discoverUsers = catchAsync(async (req, res, next) => {
  const users = await userService.discoverUsers(req.user.id, req.query);
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});