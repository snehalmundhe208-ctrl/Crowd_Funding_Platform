const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../config/db');
const logger = require('../config/logger');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return process.env.JWT_SECRET;
};

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatar: user.avatar,
  isVerified: user.isVerified,
  kycStatus: user.kyc?.status || null,
  kyc: user.kyc || null
});

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email, password, name, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRole = role === 'CREATOR' ? 'CREATOR' : 'DONOR';

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: userRole
        },
        include: {
          kyc: true
        }
      });

      await tx.notification.create({
        data: {
          userId: createdUser.id,
          title: 'Welcome to CrowdFlow!',
          message: `Hello ${name}, thank you for joining our platform.`,
          type: 'SYSTEM'
        }
      });

      return createdUser;
    });
    
    logger.info(`User registered successfully: ${user.email} (ID: ${user.id})`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please sign in to continue.',
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { kyc: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, error: 'Your account has been suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);
    
    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ success: false, error: 'No account associated with this email.' });
    }

    // Mock response for password recovery
    logger.info(`Password reset link requested for user: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Reset instructions have been sent to your email. (Mock response: reset token created successfully)'
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        kyc: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    let avatarUrl = req.user.avatar;

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || req.user.name,
        avatar: avatarUrl
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isVerified: true,
        kyc: true
      }
    });

    logger.info(`User profile updated: ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      user: serializeUser(updatedUser)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  getProfile,
  updateProfile
};
