// src/middleware/errorMiddleware.js

/**
 * Middleware penanganan error global.
 * Fungsi ini harus memiliki 4 parameter (err, req, res, next).
 */
const errorHandler = (err, req, res, next) => {
    
    // PERBAIKAN KRUSIAL: Ambil statusCode dari objek error kustom (err.statusCode).
    // Jika tidak ada (misalnya error sistem tak terduga), gunakan 500.
    const statusCode = err.statusCode || 500;

    res.status(statusCode);

    // Kirim respons JSON
    res.json({
        // Gunakan 'error' atau 'message' tergantung preferensi front-end Anda. Saya menggunakan 'error'
        error: err.message, 
        // detail ini sangat berguna untuk error database
        detail: err.detail || null, 
        // Di lingkungan Development, kirim stack trace untuk debugging
        stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    });

    // Logging di konsol server
    console.error(`[GLOBAL ERROR] Status ${statusCode}: ${err.message}`);
    if (err.stack) {
        console.error(err.stack);
    }
};

module.exports = {
    errorHandler
};