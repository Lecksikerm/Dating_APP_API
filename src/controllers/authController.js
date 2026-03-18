const { body } = require('express-validator');
const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const signToken = (id) => {
    return require('jsonwebtoken').sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    res.cookie('jwt', token, {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user },
    });
};

exports.signupValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('age').custom((value) => {
        const num = Number(value);
        if (!Number.isInteger(num) || num < 18 || num > 100) {
            throw new Error('Age must be an integer between 18 and 100');
        }
        return true;
    }),
    body('gender').notEmpty().withMessage('Gender is required').isIn(['male', 'female', 'other', 'prefer-not-to-say']),
];

exports.signup = catchAsync(async (req, res, next) => {
    const { name, email, password, age, gender } = req.body;

    logger.info(`Signup attempt for email: ${email}`);

    const result = await authService.signup(name, email, password, age, gender);

    logger.info(`User created successfully: ${result.user._id}`);

    const user = result.user.toObject();

    delete user.password;
    delete user.verificationToken;
    delete user.passwordResetToken;
    delete user.passwordResetExpires;

    res.status(201).json({
        status: 'success',
        message: 'Verification email sent. Please check your inbox.',
        data: { user },
    });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
    const { token } = req.params;

    logger.info(`Email verification attempt with token`);

    const user = await authService.verifyEmail(token);

    logger.info(`Email verified for user: ${user._id}`);

    createSendToken(user, 200, res);
});

exports.loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Please provide a password'),
];

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    logger.info(`Login attempt for email: ${email}`);

    const user = await authService.login(email, password);

    logger.info(`User logged in successfully: ${user._id}`);

    createSendToken(user, 200, res);
});

exports.forgotPasswordValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
];

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    logger.info(`Password reset request for: ${email}`);

    await authService.forgotPassword(email);

    res.status(200).json({
        status: 'success',
        message: 'Token sent to email!',
    });
});

exports.resetPasswordValidation = [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('passwordConfirm').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
];

exports.resetPassword = catchAsync(async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    logger.info(`Password reset attempt`);

    const user = await authService.resetPassword(token, password);

    logger.info(`Password reset successful for user: ${user._id}`);

    createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
    if (req.user) {
        await authService.logout(req.user.id);
    }

    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({ status: 'success' });
});

exports.updatePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Please provide your current password'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

exports.updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    logger.info(`Password update for user: ${req.user.id}`);

    const user = await authService.updatePassword(req.user.id, currentPassword, newPassword);

    logger.info(`Password updated successfully for user: ${user._id}`);

    createSendToken(user, 200, res);
});

exports.getMe = catchAsync(async (req, res, next) => {
    res.status(200).json({
        status: 'success',
        data: { user: req.user },
    });
});