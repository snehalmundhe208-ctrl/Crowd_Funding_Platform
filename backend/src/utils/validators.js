const { body } = require('express-validator');

const registerValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .escape(),
  body('role')
    .optional()
    .isIn(['DONOR', 'CREATOR'])
    .withMessage('Role must be either DONOR or CREATOR.')
];

const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
];

const forgotPasswordValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail()
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator
};
