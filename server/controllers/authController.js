const authService = require('../services/authService');

function register(req, res) {
  try {
    const result = authService.register(req.body);
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

function login(req, res) {
  try {
    const result = authService.login(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

function getCurrentUser(req, res) {
  try {
    const user = authService.getCurrentUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}

function logout(req, res) {
  try {
    authService.logout(
      req.token,
      req.user ? req.user.id : null,
      req.user ? req.user.exp : null
    );
    return res.status(200).json({ message: 'Logout successful. Session terminated.' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to securely invalidate session.' });
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
  logout
};
