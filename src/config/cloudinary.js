const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'dating-app/profiles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'fill' }],
    },
});


const galleryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'dating-app/gallery',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
    },
});

const voiceStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'dating-app/voice',
        resource_type: 'video', 
        allowed_formats: ['mp3', 'wav', 'ogg', 'webm', 'm4a'],
    },
});

const chatFileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
        folder: 'dating-app/chat-files',
        resource_type: 'auto',
        allowed_formats: [
            'jpg', 'jpeg', 'png', 'webp', 'gif',
            'mp4', 'mov', 'webm',
            'pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'
        ]
    })
});

const uploadProfile = multer({ storage: profileStorage });
const uploadGallery = multer({ storage: galleryStorage });
const uploadVoice = multer({
    storage: voiceStorage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});
const uploadChatFile = multer({
    storage: chatFileStorage,
    limits: { fileSize: 25 * 1024 * 1024 }
});

module.exports = { cloudinary, uploadProfile, uploadGallery, uploadVoice, uploadChatFile };
