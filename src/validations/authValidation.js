const Joi = require('joi');

const signupValidation = Joi.object({
    name: Joi.string().trim().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    age: Joi.number().integer().min(18).max(100).required(),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say').required(),
}).unknown(false); 

const loginValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
}).unknown(false);

const forgotPasswordValidation = Joi.object({
    email: Joi.string().email().required(),
}).unknown(false);

const resetPasswordValidation = Joi.object({
    password: Joi.string().min(8).required(),
    passwordConfirm: Joi.string().valid(Joi.ref('password')).required(),
}).unknown(false);

const updatePasswordValidation = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
}).unknown(false);

module.exports = {
    signupValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    updatePasswordValidation,
};