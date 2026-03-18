const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await userService.getMe(req.user.id);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUser(req.params.id);
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