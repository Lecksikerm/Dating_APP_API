const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadProfile, uploadGallery } = require('../config/cloudinary');

router.use(protect);

router.get('/me', userController.getMe);
router.patch('/update-profile', userController.updateProfile);
router.post('/upload-profile-picture', uploadProfile.single('image'), userController.uploadProfilePicture);
router.post('/add-gallery-image', uploadGallery.single('image'), userController.addGalleryImage);
router.patch('/remove-gallery-image', userController.removeGalleryImage);
router.get('/discover', userController.discoverUsers);
router.get('/:id', userController.getUser);

module.exports = router;