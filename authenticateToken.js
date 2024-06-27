// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');

// Middleware to authenticate token and set req.user
const authenticateToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied, token missing!' });

    try {
        const decoded = jwt.verify(token, "yourSecret"); // Use your secret key
        req.user = decoded; // Attach the decoded payload to req.user
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token!' });
    }
};

module.exports = authenticateToken;
