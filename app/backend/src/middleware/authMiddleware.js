// src/middleware/authMiddleware.js

// Pastikan lokasi file ini adalah src/middleware/authMiddleware.js
// dan pastikan semua rute mengimpornya dengan path yang benar: 
// require('../middleware/authMiddleware')

const jwt = require('jsonwebtoken');

// Catatan: Asumsikan process.env.JWT_SECRET sudah dimuat melalui dotenv di server.js
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware untuk memverifikasi JWT token dan mengautentikasi pengguna.
 * Menetapkan req.user = { id, role } jika token valid.
 */
const authenticateToken = (req, res, next) => {
    // 1. Ambil token dari header 'Authorization'. Formatnya: "Bearer <token>"
    const authHeader = req.headers.authorization;
    
    // Periksa format header: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // 401 Unauthorized: Format token tidak valid atau tidak ditemukan
        return res.status(401).json({ 
            error: 'Akses ditolak. Format token tidak valid atau tidak ditemukan.' 
        });
    }

    const token = authHeader.split(' ')[1]; // Ambil token

    // 2. Verifikasi token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // Tentukan jenis error secara spesifik untuk respons yang lebih baik
            let errorMessage = 'Token tidak valid.';
            let statusCode = 403; // Forbidden
            
            if (err.name === 'TokenExpiredError') {
                errorMessage = 'Token kedaluwarsa. Silakan login kembali.';
                statusCode = 401; // Unauthorized (butuh login baru)
            } else if (err.name === 'JsonWebTokenError') {
                 errorMessage = 'Token tidak diformat dengan benar.';
            }

            // Menggunakan 401 untuk token kedaluwarsa, 403 untuk token salah
            return res.status(statusCode).json({ error: errorMessage });
        }
        
        // 3. Token valid, simpan payload user (id, role) di objek request
        // Payload berisi { id: userId, role: userRole }
        req.user = decoded; 
        
        // Lanjutkan ke handler route berikutnya
        next();
    });
};

/**
 * Middleware untuk membatasi akses berdasarkan peran (role).
 * Contoh penggunaan: authorizeRole('admin')
 */
const authorizeRole = (requiredRole) => {
    return (req, res, next) => {
        // Memastikan authenticateToken sudah berjalan dan req.user tersedia
        if (!req.user || !req.user.role) {
            // Jika ini terjadi, berarti ada masalah di urutan middleware di route
            console.error('ERROR Otorisasi: req.user atau role tidak ditemukan.');
            return res.status(401).json({ error: 'Tidak terotentikasi. Data pengguna hilang.' });
        }

        // Cek peran
        if (req.user.role !== requiredRole) {
            // 403 Forbidden: Pengguna tidak memiliki izin yang diperlukan
            return res.status(403).json({ error: `Akses dilarang. Hanya peran '${requiredRole}' yang diizinkan.` });
        }

        // Pengguna memiliki peran yang tepat
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRole,
};