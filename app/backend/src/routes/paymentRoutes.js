// src/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const { initiatePayment, handleWebhook } = require('../controllers/paymentController');

// Rute untuk memulai pembayaran (membuat token Midtrans/Xendit)
router.post('/initiate', initiatePayment);

// Rute untuk menerima notifikasi dari Payment Gateway (webhook)
router.post('/webhook', handleWebhook);

module.exports = router;