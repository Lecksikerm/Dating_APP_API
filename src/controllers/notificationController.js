const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');

exports.getMyNotifications = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const page = parseInt(req.query.page, 10) || 1;

  const notifications = await Notification.find({ recipient: req.user.id })
    .populate('actor', 'name profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: { notifications },
  });
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    status: 'success',
    data: { unreadCount },
  });
});

exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true, readAt: Date.now() },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      status: 'fail',
      message: 'Notification not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: { notification },
  });
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true, readAt: Date.now() }
  );

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read',
  });
});
