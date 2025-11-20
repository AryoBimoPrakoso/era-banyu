// src/config/db.js (Koneksi Firebase Firestore)

// Mengimpor modul yang dibutuhkan
const admin = require('firebase-admin');
const path = require('path'); 

// 1. Ambil path file kunci dari variabel lingkungan (.env)
const serviceAccountPathRelative = process.env.FIREBASE_SERVICE_ACCOUNT_PATH; 

// Tentukan path ke root folder backend (tempat server.js dan file JSON berada)
// Karena db.js ada di src/config, kita naik dua level (../..)
const rootDir = path.resolve(__dirname, '..', '..');

// 2. Tentukan PATH ABSOLUT untuk file JSON
// Ini menggabungkan root direktori backend dengan path relatif dari .env
const absolutePath = path.join(rootDir, serviceAccountPathRelative);

// Menggunakan try...catch untuk menangani error 'Cannot find module' dengan lebih informatif
try {
    // 3. Gunakan PATH ABSOLUT untuk me-require file service account JSON
    const serviceAccount = require(absolutePath);

    // 4. Konfigurasi Admin SDK
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID, 
    });

    // 5. Ekspor instance Firestore
    const db = admin.firestore();

    console.log('✅ Koneksi Firebase Firestore berhasil diinisialisasi.');

    // --- PERBAIKAN KRUSIAL DI SINI ---
    // Ekspor 'db' dan 'admin' sebagai properti objek agar bisa di-destructuring
    module.exports = {
        db, 
        admin // Ekspor juga admin karena dibutuhkan di controller
    };
    
} catch (error) {
    // Menampilkan pesan error yang jelas jika file tidak ditemukan
    console.error('❌ GAGAL MENGINISIALISASI FIREBASE ADMIN SDK!');
    console.error(`Penyebab: File kunci Service Account tidak ditemukan di path: ${absolutePath}`);
    console.error("Pastikan file JSON Anda bernama 'firebase-adminsdk.json' dan berada di root /app/backend/.");
    
    // Keluar dari aplikasi dengan kode error
    process.exit(1); 
}