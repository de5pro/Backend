const express = require('express');
const { registerUser, loginUser } = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/'); // Save uploaded files in the 'uploads' directory
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Get the file extension
        cb(null, Date.now() + ext); // Store file with unique name (timestamp + extension)
    },
});

const upload = multer({ storage: storage });

// Route for user registration with image upload
router.post('/register', upload.single('photo_ktm'), registerUser);
router.post('/login', upload.single('photo_face'), loginUser);

module.exports = router;
