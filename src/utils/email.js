const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `Diamond Dating App <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${options.email}`);
    } catch (error) {
        logger.error('Email sending error:', error);
        throw error;
    }
};

module.exports = sendEmail;