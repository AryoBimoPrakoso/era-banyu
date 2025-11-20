const nodemailer = require('nodemailer');

// --- PENTING ---
// Gunakan kredensial REAL (misalnya dari SendGrid, Gmail SMTP, atau layanan lain) 
// untuk produksi. Untuk pengujian lokal, kami sarankan Ethereal Email.
// Kredensial ini harus diambil dari environment variables (.env).

const createTransporter = () => {
    // Kredensial default untuk Ethereal (Ganti ini dengan data Anda dari .env!)
    const isLocal = process.env.NODE_ENV !== 'production';

    const transporter = nodemailer.createTransport({
        // Contoh untuk GMAIL (jika menggunakan)
        // host: 'smtp.gmail.com',
        // port: 465,
        // secure: true,
        // Contoh untuk Ethereal/Pengujian Lokal
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER || 'tabitha.murphy70@ethereal.email', // Ganti dengan user Ethereal Anda
            pass: process.env.EMAIL_PASS || 'WcvWsk6fDm4v7hkJ8r',         // Ganti dengan pass Ethereal Anda
        },
        // Opsi tambahan untuk debugging
        logger: isLocal,
        debug: isLocal,
    });

    if (isLocal) {
        console.log('--- EMAIL INFO ---');
        console.log(`Menggunakan Transporter: ${transporter.options.host}:${transporter.options.port}`);
        console.log('Pastikan Anda memiliki kredensial email yang valid di file .env.');
        console.log('------------------');
    }

    return transporter;
};

const transporter = createTransporter();

module.exports = {
    transporter,
};