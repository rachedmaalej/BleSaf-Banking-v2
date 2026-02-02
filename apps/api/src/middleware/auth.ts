import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@blesaf/shared';
import { config } from '../config';
import { UnauthorizedError } from '../lib/errors';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      tenantId?: string;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    req.user = payload;
    req.tenantId = payload.tenantId;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token present, but doesn't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    req.user = payload;
    req.tenantId = payload.tenantId;

    next();
  } catch {
    // Token invalid/expired but that's okay for optional auth
    next();
  }
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES,
  });
}

/**
 * Generate refresh token (longer lived)
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES,
  });
}
