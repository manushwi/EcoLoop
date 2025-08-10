const express = require('express');
const path = require('path');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Utility to serve static HTML pages from /public/pages
const servePage = (pageName) => (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', `${pageName}.html`));
};

// Public Pages
router.get('/', servePage('index'));
router.get('/login', servePage('login'));
router.get('/signup', servePage('signup'));

// Protected Pages
router.get('/upload', isAuthenticated, servePage('upload'));
router.get('/analyzing', isAuthenticated, servePage('analyzing'));
router.get('/result', isAuthenticated, servePage('result'));
router.get('/recycle', isAuthenticated, servePage('recycle'));
router.get('/reuse', isAuthenticated, servePage('reuse'));
router.get('/donate', isAuthenticated, servePage('donate'));
router.get('/dashboard', isAuthenticated, servePage('dashboard'));

// Optional: 404 fallback for unknown frontend routes
router.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'public', 'pages', '404.html'));
});

module.exports = router;
