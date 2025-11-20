// src/utils/customError.js

/**
 * Fungsi pembantu untuk membuat objek Error kustom dengan kode status HTTP.
 * Berguna untuk melemparkan error di controller yang dapat dipahami
 * oleh errorMiddleware (Global Error Handler).
 * @param {string} message - Pesan error yang akan ditampilkan ke pengguna.
 * @param {number} statusCode - Kode status HTTP (misalnya 400, 401, 403, 404).
 * @returns {Error} Objek Error dengan properti statusCode.
 */
const customError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

module.exports = {
    customError,
};