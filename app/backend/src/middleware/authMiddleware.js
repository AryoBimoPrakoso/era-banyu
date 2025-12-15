// src/middleware/authMiddleware.js - VERSI FINAL (Menggunakan Variabel Lingkungan)

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/customError'); 

// =======================================
// 1. Middleware: Verifikasi Token (Otentikasi)
// =======================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Akses ditolak. Token tidak ditemukan atau format tidak valid. Gunakan format: Bearer <token>.'));
    }
    
    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
        console.error("Kesalahan Konfigurasi: Variabel lingkungan JWT_SECRET UNDEFINED atau tidak dimuat!");
        return next(new UnauthorizedError('Kesalahan Server: Kunci rahasia otentikasi tidak ditemukan.'));
    }

    // 2. Verifikasi token menggunakan variabel lingkungan
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.admin = decoded; 
        next();
    } catch (err) {
        // Token tidak valid (tanda tangan salah, kunci salah, atau kedaluwarsa).
        return next(new UnauthorizedError('Token tidak valid atau kedaluwarsa.'));
    }
};

// =======================================
// 2. Middleware Utility: Pembatas Akses Berdasarkan Peran (RBAC)
// =======================================
const authorizeRoles = (...allowedRoles) => {
    // Normalisasi allowedRoles menjadi huruf kecil untuk perbandingan yang konsisten
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

    return (req, res, next) => {
        if (!req.admin || !req.admin.role) {
            // Ini terjadi jika verifyToken tidak dipanggil atau gagal (walaupun seharusnya tidak)
            return next(new ForbiddenError('Akses Ditolak. Informasi otentikasi (Token) belum terverifikasi.'));
        }

        // Ambil role dari token dan normalisasi ke huruf kecil
        const adminRole = req.admin.role.toLowerCase(); 

        if (!normalizedAllowedRoles.includes(adminRole)) {
            const roleList = allowedRoles.join(', ');
            return next(new ForbiddenError(`Akses Ditolak. Peran Anda (${req.admin.role}) tidak diizinkan untuk mengakses fitur ini. Diperlukan peran: ${roleList}.`));
        }

        next();
    };
};

// =======================================
// 3. Middleware Role Spesifik (Menggunakan Array Middleware)
// =======================================
// Memastikan verifyToken selalu dijalankan SEBELUM authorizeRoles
const verifyAdmin = [verifyToken, authorizeRoles('editor', 'superadmin')];
const verifySuperAdmin = [verifyToken, authorizeRoles('superadmin')];


// =======================================
// Export Module
// =======================================
module.exports = {
    verifyToken, 
    verifyAdmin, 
    verifySuperAdmin, 
    authorizeRoles 
};