const jwt = require('jsonwebtoken');
const http = require('http');
const config = process.env;
const pool = require('../../config/db');

// Login and generate token with public and private keys
exports.loginAndGenerateToken = async (req, res) => {
    const { privateKey } = req.body;

    const publicKey = 'SELECT * FROM registered_student WHERE public_key = $1'; // Retrieve public key for this user

    // Create a JWT with the public and private key, expires in 1 hour
    const token = jwt.sign(
        { publicKey, privateKey },
        config.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({
        success: true,
        token,
    });
};

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: 'A token is required for authentication' });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Verify and vote function
exports.verifyAndVote = async (req, res) => {
    const { publicKey, privateKey } = req.user;
    const { vote } = req.body;

    const student = await pool.findOne({ where: { publicKey } });
    

    if (!student) {
        return res.status(404).json({ success: false, message: 'Public key not found' });
    }

    const transactionData = new URLSearchParams({
        fromAddress: publicKey,
        toAddress: vote,
        amount: 1,
        privateKey: privateKey
    }).toString();

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/createTransaction',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': transactionData.length
        }
    };

    const httpRequest = http.request(options, (httpRes) => {
        let data = '';

        httpRes.on('data', (chunk) => {
            data += chunk;
        });

        httpRes.on('end', async () => {
            const responseData = JSON.parse(data);

            if (responseData.success) {
                await pool.update({ voting_status: true }, { where: { publicKey } });
                
                res.json({
                    success: true,
                    message: 'Transaction successful',
                    publicKey,
                    privateKey
                });
            } else {
                res.status(400).json({ success: false, message: 'Transaction failed' });
            }
        });
    });

    httpRequest.on('error', (error) => {
        console.error(`Request error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal server error' });
    });

    httpRequest.write(transactionData);
    httpRequest.end();
};

module.exports = {
    loginAndGenerateToken,
    verifyToken,
    verifyAndVote
};
