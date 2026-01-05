const jwtUtils = require('../utils/jwt');
const User = require('../models/User');




const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        error: {
          message: 'Access denied. No token provided',
          code: 'NO_TOKEN'
        }
      });
    }

    // Extract token (handle both "Bearer token" and "token" formats)
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Access denied. Invalid token format',
          code: 'INVALID_TOKEN_FORMAT'
        }
      });
    }

    // Verify token
    const decoded = jwtUtils.verifyToken(token);
    
    // Get user from database to ensure they still exist
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Access denied. User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Attach user and token info to request
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;
    
    next();
  } catch (error) {
    // Handle different types of token errors
    if (error.message.includes('expired')) {
      return res.status(401).json({
        error: {
          message: 'Access denied. Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    } else if (error.message.includes('invalid') || error.message.includes('malformed')) {
      return res.status(401).json({
        error: {
          message: 'Access denied. Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(401).json({
        error: {
          message: 'Access denied. Authentication failed',
          code: 'AUTH_FAILED'
        }
      });
    }
  }
};


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      // No token provided, continue without authentication
      return next();
    }

    // Extract token
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }

    if (!token) {
      return next();
    }

    // Try to verify token
    const decoded = jwtUtils.verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user) {
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't return errors, just continue without user
    next();
  }
};


const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        message: 'Access denied. Authentication required',
        code: 'AUTH_REQUIRED'
      }
    });
  }
  next();
};

const validateTokenFormat = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({
      error: {
        message: 'Access denied. No token provided',
        code: 'NO_TOKEN'
      }
    });
  }

  let token;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = authHeader;
  }

  if (!jwtUtils.isValidTokenFormat(token)) {
    return res.status(401).json({
      error: {
        message: 'Access denied. Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      }
    });
  }

  req.token = token;
  next();
};


const checkTokenExpiration = (req, res, next) => {
  if (!req.token) {
    return res.status(401).json({
      error: {
        message: 'Access denied. No token provided',
        code: 'NO_TOKEN'
      }
    });
  }

  if (jwtUtils.isTokenExpired(req.token)) {
    return res.status(401).json({
      error: {
        message: 'Access denied. Token has expired',
        code: 'TOKEN_EXPIRED'
      }
    });
  }

  next();
};


const extractUserId = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (authHeader) {
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }

    const userId = jwtUtils.extractUserId(token);
    if (userId) {
      req.userId = userId;
    }
  }
  
  next();
};

const getUserIdentifier = (req) => {
  if (req.user && req.user._id) {
    return `user:${req.user._id}`;
  }
  
  if (req.userId) {
    return `user:${req.userId}`;
  }
  
  // Fallback to IP address
  return `ip:${req.ip || req.connection.remoteAddress}`;
};

/**
 * Middleware to add user context to response headers (for debugging)
 */
const addUserContext = (req, res, next) => {
  if (req.user) {
    res.set('X-User-ID', req.user._id.toString());
    res.set('X-User-Email', req.user.email);
  }
  
  if (req.tokenPayload) {
    res.set('X-Token-Issued', new Date(req.tokenPayload.iat * 1000).toISOString());
    if (req.tokenPayload.exp) {
      res.set('X-Token-Expires', new Date(req.tokenPayload.exp * 1000).toISOString());
    }
  }
  
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAuth,
  validateTokenFormat,
  checkTokenExpiration,
  extractUserId,
  getUserIdentifier,
  addUserContext
};