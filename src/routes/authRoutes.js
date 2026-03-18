const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validateRequest');
const authValidation = require('../validations/authValidation');
const { protect } = require('../middleware/auth');

router.post('/signup', validate(authValidation.signupValidation), authController.signup);

router.get('/verify-email/:token', authController.verifyEmail);

router.post('/login', validate(authValidation.loginValidation), authController.login);

router.post(
    '/forgot-password',
    validate(authValidation.forgotPasswordValidation),
    authController.forgotPassword
);

router.patch(
    '/reset-password/:token',
    validate(authValidation.resetPasswordValidation),
    authController.resetPassword
);

router.use(protect);

router.get('/me', authController.getMe);

router.patch(
    '/update-password',
    validate(authValidation.updatePasswordValidation),
    authController.updatePassword
);

router.get('/logout', authController.logout);

module.exports = router;