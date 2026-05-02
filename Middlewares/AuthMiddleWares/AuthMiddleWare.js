const jwt = require('jsonwebtoken');
const secretkey = process.env.secretKey || "iamAnaz";
const User = require('../../Auth/Model/UserModel');
const Shoper = require('../../Auth/Model/ShoperModel');
const Admin = require('../../Auth/Model/AdminModel');

// 1. Authentication Middleware: Verify identity and fetch user data
module.exports.verifyToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: 'Authentication token is required' });
    }

    try {
        // Decode the token
        const decoded = jwt.verify(token, secretkey);
        req.userId = decoded.id;
        const tokenRole = decoded.role;

        if (!tokenRole) {
            return res.status(401).json({ success: false, message: 'Invalid token: Role missing. Please log in again.' });
        }

        let user;
        // Strict lookup based on role in token
        if (tokenRole === 'admin') {
            user = await Admin.findById(req.userId);
        } else if (tokenRole === 'shop') {
            user = await Shoper.findById(req.userId);
        } else if (tokenRole === 'user') {
            user = await User.findById(req.userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User session expired or user not found" });
        }

        // Attach user and role to request object
        req.user = user;
        req.role = tokenRole;

        console.log(`User authenticated: ${req.userId} with role: ${req.role}`);
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// 2. Authorization Middleware: Restrict access based on roles
module.exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${req.role}' is not authorized to access this route.`
            });
        }
        next();
    };
};
  