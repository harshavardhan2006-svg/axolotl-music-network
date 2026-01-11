import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, param, query, validationResult } from 'express-validator';

// Rate limiting middleware
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
});

// Input validation middleware
export const validateRequest = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      next();
    }
  ];
};

// Common validation rules
export const hallValidation = {
  create: [
    body('name').trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').optional().trim().isLength({ max: 500 }).escape(),
    body('type').isIn(['public', 'private']),
  ],
  update: [
    param('hallId').isMongoId(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').optional().trim().isLength({ max: 500 }).escape(),
    body('type').optional().isIn(['public', 'private']),
  ],
  message: [
    param('hallId').isMongoId(),
    body('content').trim().isLength({ min: 1, max: 1000 }).escape(),
    body('replyToId').optional().isMongoId(),
  ],
  music: [
    param('hallId').isMongoId(),
    body('songId').optional().isMongoId(),
    body('position').optional().isNumeric().toFloat(),
  ],
};

// CSRF protection for state-changing operations
export const csrfProtection = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;
    
    if (!token || !sessionToken || token !== sessionToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
};