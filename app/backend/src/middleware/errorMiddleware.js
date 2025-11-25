// src/middleware/errorMiddleware.js

const { CustomError } = require('../utils/customError');
const { NotFoundError } = require('../utils/customError'); // Impor spesifik NotFoundError

/**
 * Middleware untuk menangani rute yang tidak ditemukan (404 Not Found).
 * Harus diposisikan sebelum errorHandler dan setelah semua rute.
 */
const notFound = (req, res, next) => {
    // Menggunakan NotFoundError yang sudah terdefinisi
    const error = new NotFoundError(`Rute ${req.originalUrl} tidak ada di server ini.`);
    
    // Lanjutkan ke error handler global (errorHandler)
    next(error);
};


/**
 * Middleware penanganan error global.
 * Fungsi ini harus memiliki 4 parameter (err, req, res, next).
 */
const errorHandler = (err, req, res, next) => {
    
    let errorToHandle = err;
    let statusCode = err.statusCode || 500;
    
    // Jika error BUKAN turunan dari CustomError, perlakukan sebagai 500 (Internal Server Error)
    if (!(err instanceof CustomError)) {
        // Logging error tak terduga di server
        console.error("UNEXPECTED SERVER ERROR:", err.message);
        console.error(err.stack); // Selalu log stack trace untuk 500
        
        // Tetapkan respons default 500
        statusCode = 500;
        // Buat objek error baru untuk respons
        errorToHandle = {
            message: 'Terjadi kesalahan internal pada server.',
            detail: null,
            stack: err.stack // Gunakan stack asli dari error tak terduga
        };
    } else {
        // Jika CustomError, gunakan objek error yang sudah ada
        errorToHandle = err;
    }
    
    // 1. Tentukan Status Code (pastikan 200 tidak pernah lolos sebagai error status code)
    // Perbaikan kecil: Ambil status code dari errorToHandle (bisa 500 jika error tak terduga)
    statusCode = errorToHandle.statusCode || 500;
    if (statusCode < 400) statusCode = 500; // Pastikan status error adalah >= 400

    // 2. Kirim respons JSON
    res.status(statusCode).json({
        success: false,
        status_code: statusCode,
        
        // Pesan error utama
        error: errorToHandle.message, 
        
        // Detail tambahan (berguna untuk error validasi atau detail 404)
        detail: errorToHandle.detail || null, 
        
        // Stack trace hanya untuk lingkungan Development
        stack: process.env.NODE_ENV === 'development' ? errorToHandle.stack : null,
    });

    // Logging di konsol server untuk setiap error yang dikirim ke klien
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[RESPON KLIEN] Status ${statusCode} (${errorToHandle.name}): ${errorToHandle.message}`);
    }
};

module.exports = {
    notFound,
    errorHandler
};