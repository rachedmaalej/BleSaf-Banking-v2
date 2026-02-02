import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';
import { UnauthorizedError, NotFoundError } from '../lib/errors';
import { JWTPayload, UserRole } from '@blesaf/shared';
import { config } from '../config';
import { logger } from '../lib/logger';

// Parse JWT expiry string to milliseconds
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export const authService = {
  /**
   * Login with email and password
   * Returns access token and refresh token
   */
  async login(email: string, password: string, deviceInfo?: string) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        tenant: {
          select: { id: true, status: true },
        },
      },
    });

    if (!user) {
      logger.warn({ email }, 'Login failed: user not found');
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'active') {
      logger.warn({ userId: user.id }, 'Login failed: user inactive');
      throw new UnauthorizedError('Account is not active');
    }

    // Check tenant status
    if (user.tenant.status !== 'active') {
      logger.warn({ userId: user.id, tenantId: user.tenantId }, 'Login failed: tenant inactive');
      throw new UnauthorizedError('Tenant is not active');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn({ userId: user.id }, 'Login failed: invalid password');
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role as UserRole,
    });

    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database (stateful)
    const expiresAt = new Date(Date.now() + parseExpiry(config.JWT_REFRESH_EXPIRES));
    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: refreshToken,
        deviceInfo: deviceInfo || null,
        expiresAt,
      },
    });

    logger.info({ userId: user.id }, 'User logged in');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId,
      },
    };
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    // Find refresh token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            tenant: { select: { status: true } },
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Check user and tenant status
    if (storedToken.user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    if (storedToken.user.tenant.status !== 'active') {
      throw new UnauthorizedError('Tenant is not active');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: storedToken.user.id,
      tenantId: storedToken.user.tenantId,
      branchId: storedToken.user.branchId,
      role: storedToken.user.role as UserRole,
    });

    return { accessToken };
  },

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  },

  /**
   * Logout from all devices - invalidate all refresh tokens for user
   */
  async logoutAllDevices(userId: string) {
    const result = await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    logger.info({ userId, count: result.count }, 'Logged out from all devices');
  },

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            logoUrl: true,
            primaryColor: true,
            languageConfig: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  },

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  },

  /**
   * Clean up expired refresh tokens
   * Should be run periodically via cron job
   */
  async cleanupExpiredTokens() {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      logger.info({ count: result.count }, 'Cleaned up expired refresh tokens');
    }

    return result.count;
  },
};
