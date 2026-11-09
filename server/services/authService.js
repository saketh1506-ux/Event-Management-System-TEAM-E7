const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authModel = require('../models/authModel');
const { JWT_SECRET, revokeToken } = require('../middleware/auth');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h', jwtid: crypto.randomUUID() }
  );
}

function register(data) {
  const { name, email, password, role } = data;

  if (!name || !email || !password) {
    throw createError(400, 'Name, email, and password are required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError(400, 'Invalid email format.');
  }

  if (password.length < 6) {
    throw createError(400, 'Password must be at least 6 characters long.');
  }

  const userRole = role === 'organizer' ? 'organizer' : 'user';
  const normalizedEmail = email.toLowerCase().trim();
  if (authModel.findUserIdByEmail(normalizedEmail)) {
    throw createError(409, 'An account with this email already exists.');
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);
  const user = authModel.createUser(name.trim(), normalizedEmail, hashedPassword, userRole);
  const token = createToken(user);

  return {
    message: 'Account created successfully.',
    token,
    user
  };
}

function login(data) {
  const { email, password } = data;
  if (!email || !password) {
    throw createError(400, 'Email and password are required.');
  }

  const user = authModel.findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    throw createError(401, 'Invalid email or password.');
  }

  if (user.status === 'suspended') {
    throw createError(403, 'Your account has been suspended by an administrator.');
  }

  if (!bcrypt.compareSync(password, user.password)) {
    throw createError(401, 'Invalid email or password.');
  }

  return {
    message: 'Login successful.',
    token: createToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  };
}

function getCurrentUser(userId) {
  return authModel.findPublicUserById(userId);
}

function logout(token, userId, expiresAt) {
  revokeToken(token, userId, expiresAt);
}

module.exports = {
  register,
  login,
  getCurrentUser,
  logout
};
