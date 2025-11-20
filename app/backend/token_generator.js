// token_generator.js
// UTILITY FILE untuk menghasilkan BCrypt Hash Password dan JWT Token (untuk pengujian)

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// =================================================================
// --- PENGATURAN KONFIGURASI ---
const JWT_SECRET = "R4h4s!aP3nuhR3s1k0T0k3n_3r4Banyu5egara_2024"; 
const saltRounds = 10; 

// --- PENGATURAN USER ADMIN/TEST ---
const ADMIN_EMAIL = 'admin@erabanyu.com'; // Pastikan ini email yang benar
const ADMIN_PASSWORD_BARU = 'adminera0123'; // Password mentah yang baru

const TEST_USER_ID = 'natg3CAjUZmUbXR9EFMj'; // ID PENGGUNA untuk Token Biasa
const ADMIN_USER_ID = 'tsE9HxossF4Xh9gDHJL7'; // ID Fiktif untuk Token Admin

// =================================================================

// 1. FUNGSI UNTUK MENGHASILKAN BCrypt HASH PASSWORD
const generateHash = (password, role = 'TEST') => {
    console.log(`\n--- 1. BCrypt HASH GENERATOR (Role: ${role}) ---`);
    console.log(`Password mentah: ${password}`);
    
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error saat membuat hash:', err);
            return;
        }
        console.log('✅ HASH BCrypt FINAL (SALIN KE FIRESTORE field: passwordHash):');
        console.log(hash); 
        console.log('-------------------------------------------\n');

        // Lanjutkan ke pembuatan token
        if (role === 'ADMIN') {
            generateToken(ADMIN_USER_ID, 'admin'); 
        } else {
            generateToken(TEST_USER_ID, 'user');
        }
    });
};

// 2. FUNGSI UNTUK MENGHASILKAN JWT TOKEN
const generateToken = (userId, role = 'user') => {
    console.log(`\n--- 2. JWT TOKEN GENERATOR (ROLE: ${role}) ---`);

    const payload = {
        id: userId,
        role: role
    };

    const options = {
        expiresIn: '1h' 
    };

    try {
        const token = jwt.sign(payload, JWT_SECRET, options);
        
        console.log(`User ID: ${userId}`);
        console.log('✅ TOKEN JWT FINAL (SALIN DAN GUNAKAN DI HEADER AUTHORIZATION):');
        console.log(token);
        console.log('-------------------------------------------\n');
    } catch (error) {
        console.error('Gagal membuat token. Pastikan secret key benar.', error);
    }
};

// --- EKSEKUSI UTILITY ---
console.log("!!! UTILITY INI HANYA UNTUK SEKALI PAKAI !!!");
console.log(`Email Admin Anda: ${ADMIN_EMAIL}. Password baru yang akan di-hash: ${ADMIN_PASSWORD_BARU}`);

// Mulai dengan membuat hash password Admin yang baru
generateHash(ADMIN_PASSWORD_BARU, 'ADMIN');

// Jika Anda masih butuh hash user biasa (misalnya 'user123'), jalankan ini secara terpisah.
// generateHash('user123', 'USER');