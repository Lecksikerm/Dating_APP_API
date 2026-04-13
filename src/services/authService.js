const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const sendEmail = require('../utils/email');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

exports.signup = async (name, email, password, age, gender) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new AppError('Email already in use', 400);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = await User.create({
        name,
        email,
        password,
        age,
        gender,
        verificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
        verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    try {
        await sendEmail({
            email: newUser.email,
            subject: 'Verify your email',
            message: `Click this link to verify your email: ${verificationURL}`,
        });
    } catch (err) {
        await User.findByIdAndDelete(newUser._id);
        logger.error('Email sending failed:', err);
        throw new AppError('Error sending verification email. Please try again.', 500);
    }

    return { user: newUser, message: 'Verification email sent' };
};

exports.verifyEmail = async (token) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // ⬇️ ADD expiry check here
    const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
        throw new AppError('Token is invalid or has expired', 400);
    }

    if (user.isVerified) {
        return user;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return user;
};

exports.login = async (email, password) => {
    if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        throw new AppError('Incorrect email or password', 401);
    }

    if (!user.isVerified) {
        throw new AppError('Please verify your email first', 401);
    }

    if (user.isActive === false) {
        throw new AppError('Your account has been deactivated', 401);
    }

    user.onlineStatus = true;
    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    return user;
};

exports.forgotPassword = async (email) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError('There is no user with that email address', 404);
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}`,
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        logger.error('Password reset email failed:', err);
        throw new AppError('There was an error sending the email. Try again later!', 500);
    }
};

exports.resetPassword = async (token, newPassword) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        throw new AppError('Token is invalid or has expired', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return user;
};

exports.logout = async (userId) => {
    const user = await User.findById(userId);
    if (user) {
        user.onlineStatus = false;
        user.lastActive = Date.now();
        await user.save({ validateBeforeSave: false });
    }
};

exports.updatePassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId).select('+password');

    if (!(await user.correctPassword(currentPassword, user.password))) {
        throw new AppError('Your current password is wrong', 401);
    }

    user.password = newPassword;
    await user.save();

    return user;
};