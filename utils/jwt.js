const jwt = require('jsonwebtoken');
 
const JWT_SECRET = process.env.JWT_SECRET || "workasana_super_secret_jwt_key_for_development_only";

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic JWT format check (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3;
};

const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

const extractUserId = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded ? decoded.id : null;
  } catch (error) {
    return null;
  }
};

module.exports = { 
  generateToken, 
  verifyToken, 
  isValidTokenFormat, 
  isTokenExpired, 
  extractUserId 
};