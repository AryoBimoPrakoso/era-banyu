// src/config/db.js

const admin = require('firebase-admin');

// Jalur ke file kredensial Service Account Firebase Anda.
// Sesuaikan jalur ini berdasarkan lokasi file JSON Anda relatif terhadap file db.js
// Contoh: src/config/db.js -> ../../firebase-adminsdk.json
const serviceAccount = require('../../firebase-adminsdk.json'); 

/**
 * Inisialisasi Firebase Admin SDK.
 * Memastikan SDK hanya diinisialisasi sekali, mencegah error pada hot-reload.
 */
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK berhasil diinisialisasi.");
    } catch (error) {
        console.error("Gagal menginisialisasi Firebase Admin SDK:", error.message);
        // Penting: Keluar dari proses jika inisialisasi DB gagal total
        // process.exit(1); 
    }
}

// Dapatkan instance Firestore
const db = admin.firestore();

// Dapatkan instance Auth dan lain-lain jika diperlukan dari SDK
const auth = admin.auth(); 

// Mengekspor instance Firestore, Auth, dan Admin SDK itu sendiri
module.exports = { 
    db,     // Instance Firestore
    admin,  // Admin SDK (digunakan untuk verifikasi token)
    auth    // Instance Auth (jika perlu operasi server-side Auth)
};