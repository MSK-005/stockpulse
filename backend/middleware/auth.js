import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, email, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Middleware to ensure user can only access their own resources
const verifySelf = (req, res, next) => {
  const requestedId = parseInt(req.params.id || req.params.user_id, 10);
  if (req.user.user_id !== requestedId) {
    return res.status(403).json({ message: 'Forbidden. You can only access your own data.' });
  }
  next();
};

export { verifyToken, verifySelf };
