const express = require('express');
const { loginAndGenerateToken, verifyAndVote, verifyToken } = require('../controllers/voteController');

const router = express.Router();

// Route to login and generate JWT
router.post('/verify', loginAndGenerateToken);

// Route to verify token and cast vote
router.post('/vote', verifyToken, verifyAndVote);

module.exports = router;