const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../../config/db');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const BASE_PATH = path.join(__dirname, '../../');

// Set up storage for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(BASE_PATH, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Function to generate mock keys
const generateWalletKeys = () => {
    const publicKey = crypto.randomBytes(64).toString('hex');
    const privateKey = crypto.randomBytes(64).toString('hex');
    return { publicKey, privateKey };
};

// Register User Function with added error handling and file upload
const registerUser = async (req, res) => {
    const { npm, name, password } = req.body;

    if (!npm || !name || !password) {
        return res.status(400).json({ message: 'Fields npm, name, and password are required.' });
    }

    // Check if the file exists
    if (!req.file) {
        return res.status(400).json({ message: 'File upload (photo_ktm) is required.' });
    }

    try {
        // Check if student is eligible
        const studentQuery = 'SELECT * FROM student_metadata WHERE npm = $1 AND name = $2';
        const studentResult = await pool.query(studentQuery, [npm, name]);

        if (studentResult.rows.length === 0) {
            console.error(`Eligibility check failed: No matching record found for npm: ${npm}, name: ${name}`);
            return res.status(403).json({ message: 'Student is not eligible to vote.' });
        }
        console.log(`Eligibility check passed for npm: ${npm}, name: ${name}`);

        // Encrypt password
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, 10);
        } catch (hashError) {
            console.error("Error hashing password:", hashError);
            return res.status(500).json({ message: 'Error encrypting password.' });
        }

        // Generate public and private keys
        let publicKey, privateKey;
        try {
            ({ publicKey, privateKey } = generateWalletKeys());
        } catch (keyError) {
            console.error("Error generating wallet keys:", keyError);
            return res.status(500).json({ message: 'Error generating wallet keys.' });
        }
        console.log(`Keys generated successfully for npm: ${npm}`);

        const photoPath = path.join('uploads', req.file.filename); // Relative path from `src`

        // Store the registered student data in registered_student table
        const insertQuery = `
            INSERT INTO registered_student (npm, name, password, public_key, voting_status, is_verified, photo_ktm)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        try {
            const insertResult = await pool.query(insertQuery, [npm, name, hashedPassword, publicKey, false, false, photoPath]);
            console.log(`Student registered successfully in registered_student table with npm: ${npm}`);
        } catch (insertError) {
            console.error("Error inserting student data into registered_student:", insertError);
            return res.status(500).json({ message: 'Error saving student registration data.' });
        }

        // Respond with success message and generated keys
        res.json({
            message: 'Student registered successfully.',
            npm,
            publicKey,
            privateKey,
            photoPath, 
        });
    } catch (error) {
        console.error("Unexpected error during registration:", error);
        res.status(500).json({ message: 'An unexpected error occurred during registration.' });
    }
};

// Function to handle login with photo validation and wallet validation
const loginUser = async (req, res) => {
    const { npm, password, private_key } = req.body;

    if (!npm || !password || !private_key) {
        return res.status(400).json({ message: 'All fields (npm, password, private_key) are required.' });
    }

    // Check if the file exists
    if (!req.file) {
        return res.status(400).json({ message: 'File upload (photo_face) is required.' });
    }

    try {
        // Verify user credentials
        const userQuery = 'SELECT * FROM registered_student WHERE npm = $1';
        const userResult = await pool.query(userQuery, [npm]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = userResult.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (typeof password !== 'string' || typeof user.password !== 'string') {
            return res.status(400).json({ message: 'Invalid password format.' });
        }
        
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }

        // Photo Checking (Bernanda)
        const photoPath = path.join(BASE_PATH, user.photo_ktm); // Path to stored photo_ktm
        // const photoValidationResponse = await axios.post('http://localhost:5000/similarityChecking', {
        //     npm: user.npm,
        //     photo_face: req.file.buffer,
        //     photo_ktm: fs.createReadStream(photoPath)
        // });

        // if (photoValidationResponse.data.message !== "Identity validated successfully") {
        //     return res.status(400).json({ message: 'Photo validation failed.' });
        // }

        // Hardcoded mock wallet validation response
        const mockTransaction = {
            message: "New Wallet validated successfully",
            transaction: {
                from: "049245c3867215b8f4277c15a9bffee568dc4f5cb2c393f4b1263780aa5a4df0640c036dd69a1c93e5c189a28cbc6781aa6b87dc25be27e5bea0f1bcf25be7efcb",
                to: "554bd169c8cd034e7dd68c84f2955d98373e808ccc0ae6558da47923a2fd4015",
                amount: 1,
                signature: "3046022100e14b53c9cca02edb47d79b47ff92160ce7fca970b24d40bd7eec5930d3f5cadb022100a7399b9dc71a96979905d4893cc1f9d45099835c7c7cb712e517c8d4f9741548"
            }
        };

        // Check if the "to" address matches the user's public_key
        if (mockTransaction.transaction.to !== user.public_key) {
            return res.status(400).json({ message: 'Wallet validation failed. Address mismatch.' });
        }

        // Update user's verification status
        try {
            const updateQuery = 'UPDATE registered_student SET is_verified = TRUE WHERE public_key = $1';
            await pool.query(updateQuery, [user.public_key]);
        } catch (dbError) {
            console.error('Database error during verification update:', dbError);
            return res.status(500).json({ message: 'Database error during verification update. Please try again later.' });
        }

        // Send the response with the success message and amount
        res.json({
            message: mockTransaction.message,
            amount: mockTransaction.transaction.amount
        });

    } catch (error) {
        console.error("Unexpected error during login process:", error);

        if (error.response) {
            return res.status(500).json({ message: `Photo validation service error: ${error.response.data.message || error.message}` });
        } else if (error.request) {
            return res.status(500).json({ message: 'Network error. Please check your connection and try again.' });
        } else {
            return res.status(500).json({ message: `An unexpected error occurred: ${error.message}` });
        }
    }
};

module.exports = {
    registerUser,
    loginUser,
    upload
};