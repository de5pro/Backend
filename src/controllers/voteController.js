const jwt = require('jsonwebtoken');
const http = require('http');
const config = process.env;
const pool = require('../../config/db');
const { default: axios } = require('axios');

// // Login and generate token with public and private keys
// const loginAndGenerateToken = async (req, res) => {
//     const { privateKey } = req.body;

//     const publicKey = 'SELECT * FROM registered_student WHERE public_key = $1'; // Retrieve public key for this user

//     // Create a JWT with the public and private key, expires in 1 hour
//     const token = jwt.sign(
//         { publicKey, privateKey },
//         config.JWT_SECRET,
//         { expiresIn: '1h' }
//     );

//     res.json({
//         success: true,
//         token,
//     });
// };


const BASE_URL = process.env.BLOCKCHAIN_BASE_URL;

const SECRET_KEY = process.env.SECRET_KEY;

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: 'A token is required for authentication' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Verify and vote function
const verifyAndVote = async (req, res) => {
    const { public_key, private_key } = req.user;
    const { vote } = req.body;

    const studentQuery = 'SELECT * FROM registered_student WHERE public_key = $1';
    const student = await pool.query(studentQuery, [public_key]);
    

    if (!student) {
        return res.status(404).json({ success: false, message: 'Public key not found' });
    }

    let toAddress = "eriqo-address";

    // candidate public keys
    // if (vote === 1) {
    //     toAddress = process.env.CANDIDATE_1;
    // }

    try {
        const result = await axios.post(BASE_URL + 'createTransaction', {
            fromAddress: public_key,
            toAddress: toAddress,
            amount: 1,
            privateKey: private_key,
        });
    } catch (err) {
        return res.status(400).json({
            message: err,
        })
    }
    

    try {
        const updateQuery = 'UPDATE registered_student SET voting_status = TRUE WHERE public_key = $1';
        await pool.query(updateQuery, [public_key]);
    } catch (dbError) {
        console.error('Database error during verification update:', dbError);
        return res.status(500).json({ message: 'Database error during verification update. Please try again later.' });
    }

    res.json({
        message: 'Vote casted successfully'
    });

    // const transactionData = new URLSearchParams({
    //     fromAddress: publicKey,
    //     toAddress: vote,
    //     amount: 1,
    //     privateKey: privateKey
    // }).toString();

    // const options = {
    //     hostname: 'localhost',
    //     port: 5000,
    //     path: '/createTransaction',
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded',
    //         'Content-Length': transactionData.length
    //     }
    // };

    // const httpRequest = http.request(options, (httpRes) => {
    //     let data = '';

    //     httpRes.on('data', (chunk) => {
    //         data += chunk;
    //     });

    //     httpRes.on('end', async () => {
    //         const responseData = JSON.parse(data);

    //         if (responseData.success) {
    //             await pool.update({ voting_status: true }, { where: { publicKey } });
                
    //             res.json({
    //                 success: true,
    //                 message: 'Transaction successful',
    //                 publicKey,
    //                 privateKey
    //             });
    //         } else {
    //             res.status(400).json({ success: false, message: 'Transaction failed' });
    //         }
    //     });
    // });

    // httpRequest.on('error', (error) => {
    //     console.error(`Request error: ${error.message}`);
    //     res.status(500).json({ success: false, message: 'Internal server error' });
    // });

    // httpRequest.write(transactionData);
    // httpRequest.end();
};

module.exports = {
    // loginAndGenerateToken,
    verifyToken,
    verifyAndVote
};
