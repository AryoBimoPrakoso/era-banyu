// src/utils/customError.js

/**
 * Kelas Error Kustom dasar (Base Class).
 * Semua error yang dilemparkan (throw) untuk klien HTTP akan menjadi turunan dari kelas ini.
 */
class CustomError extends Error {
    /**
     * @param {string} message - Pesan error yang akan dikirim ke klien.
     * @param {number} statusCode - Kode status HTTP (4xx atau 5xx).
     * @param {any} [detail=null] - Detail tambahan tentang error (misalnya error validasi field).
     */
    constructor(message, statusCode, detail = null) {
        // Panggil konstruktor Error asli dengan pesan
        super(message);
        
        // Atur nama Error agar lebih mudah dibaca saat debugging (e.g., 'BadRequestError')
        this.name = this.constructor.name;
        
        // Tetapkan kode status. Gunakan 500 sebagai default yang aman jika tidak ada.
        this.statusCode = statusCode || 500; 
        this.detail = detail;
        
        // Memastikan stack trace ditangkap dari konstruktor ini (penting untuk Node.js)
        Error.captureStackTrace(this, this.constructor);
    }
}

// ===================================
// Kelas turunan untuk error spesifik HTTP
// ===================================

// 400 Bad Request: Permintaan Klien Salah (e.g., input data tidak lengkap)
class BadRequestError extends CustomError {
    constructor(message = "Permintaan tidak valid. Periksa data input.", detail = null) {
        super(message, 400, detail);
    }
}

// 401 Unauthorized: Otentikasi Gagal (e.g., Token tidak ada atau tidak valid)
class UnauthorizedError extends CustomError {
    constructor(message = "Akses tidak sah. Silakan otentikasi.") {
        super(message, 401);
    }
}

// 403 Forbidden: Otorisasi Gagal (e.g., Token valid, tapi role tidak diizinkan)
class ForbiddenError extends CustomError {
    constructor(message = "Akses dilarang. Anda tidak memiliki izin yang sesuai.") {
        super(message, 403);
    }
}

// 404 Not Found: Sumber daya atau endpoint tidak ditemukan
class NotFoundError extends CustomError {
    constructor(message = "Sumber daya atau endpoint tidak ditemukan.") {
        super(message, 404);
    }
}

// 500 Internal Server Error: Error server tak terduga (e.g., error database, logic bug)
class InternalServerError extends CustomError {
    constructor(message = "Terjadi kesalahan internal pada server.") {
        super(message, 500);
    }
}

module.exports = {
    CustomError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    InternalServerError 
};