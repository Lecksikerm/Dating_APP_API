const Post = require('../models/Post');
const AppError = require('../utils/AppError');

exports.createPost = async (userId, postData) => {
  const { text, images, video } = postData;

  const cleanText = text?.trim() || '';
  const cleanImages = Array.isArray(images) ? images : [];
  const cleanVideo = video || null;

  if (!cleanText && cleanImages.length === 0 && !cleanVideo) {
    throw new AppError('Post must have text, images, or video', 400);
  }

  const post = await Post.create({
    user: userId,
    text: cleanText,
    images: cleanImages,
    video: cleanVideo
  });

  await post.populate('user', 'name profilePicture');
  return post;
};

exports.getFeed = async (userId, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(query.limit, 10) || 10, 1);

  const posts = await Post.find()
    .populate('user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  return posts.map(post => {
    const postObj = post.toObject();
    postObj.isLiked = post.likes.some(
      id => id.toString() === userId.toString()
    );
    return postObj;
  });
};

exports.getMyPosts = async (userId, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(query.limit, 10) || 10, 1);

  const posts = await Post.find({ user: userId })
    .populate('user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  return posts.map(post => {
    const postObj = post.toObject();
    postObj.isLiked = post.likes.some(
      id => id.toString() === userId.toString()
    );
    return postObj;
  });
};

exports.getUserPosts = async (userId, targetUserId, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(query.limit, 10) || 10, 1);

  const posts = await Post.find({ user: targetUserId })
    .populate('user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  return posts.map(post => {
    const postObj = post.toObject();
    postObj.isLiked = post.likes.some(
      id => id.toString() === userId.toString()
    );
    return postObj;
  });
};

exports.getPost = async (postId, userId) => {
  const post = await Post.findById(postId)
    .populate('user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture');

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const postObj = post.toObject();
  postObj.isLiked = post.likes.some(
    id => id.toString() === userId.toString()
  );

  return postObj;
};

exports.likePost = async (postId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const alreadyLiked = post.likes.some(
    id => id.toString() === userId.toString()
  );

  if (alreadyLiked) {
    throw new AppError('You already liked this post', 400);
  }

  post.likes.push(userId);
  post.likesCount = post.likes.length;
  await post.save({ validateBeforeSave: false });

  return post;
};

exports.unlikePost = async (postId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const hasLiked = post.likes.some(
    id => id.toString() === userId.toString()
  );

  if (!hasLiked) {
    throw new AppError('You have not liked this post', 400);
  }

  post.likes = post.likes.filter(
    id => id.toString() !== userId.toString()
  );
  post.likesCount = post.likes.length;
  await post.save({ validateBeforeSave: false });

  return post;
};

exports.addComment = async (postId, userId, text) => {
  const cleanText = text?.trim();

  if (!cleanText) {
    throw new AppError('Comment text is required', 400);
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  post.comments.push({
    user: userId,
    text: cleanText
  });

  post.commentsCount = post.comments.length;
  await post.save({ validateBeforeSave: false });

  await post.populate('comments.user', 'name profilePicture');
  return post;
};

exports.deleteComment = async (postId, commentId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const comment = post.comments.id(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  const isCommentOwner = comment.user.toString() === userId.toString();
  const isPostOwner = post.user.toString() === userId.toString();

  if (!isCommentOwner && !isPostOwner) {
    throw new AppError('You can only delete your own comments', 403);
  }

  post.comments.pull(commentId);
  post.commentsCount = post.comments.length;
  await post.save({ validateBeforeSave: false });

  return post;
};

exports.deletePost = async (postId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.user.toString() !== userId.toString()) {
    throw new AppError('You can only delete your own posts', 403);
  }

  await Post.findByIdAndDelete(postId);

  return { message: 'Post deleted successfully' };
};