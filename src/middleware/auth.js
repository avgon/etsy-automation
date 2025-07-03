const jwt = require('jsonwebtoken');
const Database = require('../database/database');

const db = new Database();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.getUserById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

const requireTokens = async (req, res, next) => {
    try {
        const tokens = await db.getUserTokens(req.user.id);
        
        if (!tokens || !tokens.openai_api_key) {
            return res.status(400).json({ 
                error: 'API tokens not configured',
                redirect: '/setup-tokens'
            });
        }

        req.userTokens = tokens;
        next();
    } catch (error) {
        console.error('Token check error:', error);
        res.status(500).json({ error: 'Failed to check tokens' });
    }
};

const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await db.getUserById(decoded.userId);
            
            if (user) {
                req.user = user;
                const tokens = await db.getUserTokens(user.id);
                req.userTokens = tokens;
            }
        }
        
        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    requireAuth,
    requireTokens,
    generateToken,
    optionalAuth,
    JWT_SECRET
};