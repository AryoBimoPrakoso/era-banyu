// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
// PENTING: Impor middleware untuk memverifikasi token admin
// Nama ini HARUS cocok dengan apa yang diekspor di authMiddleware.js (yaitu: exports.verifyAdmin)
const { verifyAdmin } = require('../middleware/authMiddleware'); 

// ===========================================
// RUTE AUTH PUBLIK (Tidak perlu token/middleware)
// ===========================================

// Rute untuk Pendaftaran Admin Pertama (First-Time Setup)
// Hanya perlu dipanggil 1x saat setup awal.
router.post('/register/first', authController.registerFirstAdmin);

// Rute untuk Login Admin
router.post('/login', authController.loginAdmin);


// ===========================================
// RUTE ADMIN TERPROTEKSI (Memerlukan token/middleware)
// ===========================================

// Rute BARU: Admin yang sudah login mendaftarkan Admin baru.
// Rute ini diproteksi oleh verifyAdmin.
router.post('/register', verifyAdmin, authController.registerNewAdmin);


module.exports = router;