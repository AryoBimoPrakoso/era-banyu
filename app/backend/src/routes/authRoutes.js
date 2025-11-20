// src/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 

// Rute Otentikasi Utama
router.post('/login', authController.login);
router.post('/register', authController.register); 

// Rute Lupa Password BARU
router.post('/forgot-password', authController.forgotPassword); // Untuk mengirim link reset ke email
router.post('/reset-password', authController.resetPassword);   // Untuk memproses kata sandi baru

module.exports = router;