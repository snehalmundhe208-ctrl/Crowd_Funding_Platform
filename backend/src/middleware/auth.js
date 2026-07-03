const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const logger = require('../config/logger');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return process.env.JWT_SECRET;
};

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { kyc: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, error: 'Your account has been suspended. Please contact administration.' });
    }

    req.user = {
      ...user,
      role: String(user.role || '').trim().toUpperCase()
    };
    next();
  } catch (error) {
    logger.error('Authentication error: %o', error);
    return res.status(401).json({ success: false, error: 'Invalid or expired token. Please log in again.' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toUpperCase();
    const allowedRoles = roles.map((role) => String(role || '').toUpperCase());

    if (!req.user || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Authorized roles: [${roles.join(', ')}]` 
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};
