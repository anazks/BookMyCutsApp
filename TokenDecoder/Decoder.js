const jwt = require('jsonwebtoken');
// Ensure this environment variable is correctly loaded (e.g., using 'dotenv')
const secretkey = process.env.secretKey; 

const Decoder = async (token) => {
    // 1. Critical Check: Ensure token exists before trying to verify
    if (!token) {
        throw new Error("Authentication token is missing.");
    }

    // 2. Critical Check: Ensure secretkey is defined
    if (!secretkey) {
        throw new Error("JWT secret key is not configured in environment variables.");
    }

    try {
        const decoded = await new Promise((resolve, reject) => {
            // jwt.verify automatically handles expiration, signature checks, etc.
            jwt.verify(token, secretkey, (err, decoded) => {
                if (err) {
                    // Reject with the specific error from jsonwebtoken (e.g., 'jwt expired')
                    return reject(err); 
                }
                resolve(decoded);
            });
        });
        return decoded;
    } catch (err) {
        // 3. FIX HERE: Throw a new error that contains the original, specific failure message.
        // This will now output: "Error: error from decoded: jwt expired" or "Error: error from decoded: invalid signature"
        throw new Error(`error from decoded: ${err.message}`); 
    }
};

module.exports = Decoder;
