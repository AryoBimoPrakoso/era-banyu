// controllers/authController.js - VERSI FINAL (Menggunakan Variabel Lingkungan)

const { db, admin } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import Custom Errors
const { BadRequestError, UnauthorizedError, InternalServerError, ForbiddenError } = require('../utils/customError'); 

// Nama koleksi untuk admin
const ADMIN_COLLECTION = 'admins';


/**
 * Utilitas untuk membuat token JWT
 * @param {object} payload - Data yang akan dimasukkan ke dalam token
 * @returns {string} Token JWT
 */
const generateToken = (payload) => {
    if (!process.env.JWT_SECRET) {
        throw new InternalServerError('Kesalahan Server: Kunci rahasia JWT tidak ditemukan.');
    }
    // Menggunakan process.env.JWT_SECRET untuk keamanan
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }); 
};


/**
 * Endpoint untuk Pendaftaran Admin Pertama (First-Time Setup)
 * HANYA boleh dipanggil jika belum ada admin terdaftar.
 */
exports.registerFirstAdmin = async (req, res, next) => {
    const { username, password, email } = req.body;
    if (!username || !password) {
        return next(new BadRequestError('Username dan password wajib diisi.'));
    }

    try {
        // 1. Cek apakah sudah ada admin terdaftar
        const snapshot = await db.collection(ADMIN_COLLECTION).limit(1).get();
        if (!snapshot.empty) {
            return next(new ForbiddenError('Admin sudah terdaftar. Silakan login atau hubungi SuperAdmin.'));
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Simpan Admin Pertama ke Firestore
        const newAdminData = {
            username: username,
            email: email,
            passwordHash: passwordHash,
            role: 'SuperAdmin', 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdByAdminId: null, 
        };

        const docRef = await db.collection(ADMIN_COLLECTION).add(newAdminData);
        const adminId = docRef.id;

        // 4. Buat JWT untuk SuperAdmin pertama
        const payload = {
            id: adminId,
            username: newAdminData.username,
            role: newAdminData.role,
        };
        const token = generateToken(payload);

        res.status(201).json({ 
            message: 'Registrasi Admin Pertama berhasil!', 
            adminId: adminId,
            token: token
        });

    } catch (error) {
        console.error('Error saat registrasi admin:', error);
        next(new InternalServerError('Gagal melakukan registrasi Admin Pertama.'));
    }
};

/**
 * Endpoint untuk Admin Mendaftarkan Pegawai Admin Baru (Pegawai Kedua, dst.)
 * Rute ini WAJIB diproteksi oleh middleware verifyAdmin.
 */
exports.registerNewAdmin = async (req, res, next) => {
    // Ambil ID Admin yang sedang login dari token (disediakan oleh verifyAdmin middleware)
    const registeringAdminId = req.admin ? req.admin.id : 'SYSTEM'; 
    const { username, password, role = 'editor', email } = req.body; 

    if (!username || !password) {
        return next(new BadRequestError('Username dan password wajib diisi untuk Admin baru.'));
    }
    
    // Opsional: Cek apakah Admin yang mendaftar punya izin untuk membuat role tertentu 
    if (role.toLowerCase() === 'superadmin' && req.admin.role.toLowerCase() !== 'superadmin') {
        return next(new ForbiddenError('Hanya SuperAdmin yang dapat mendaftarkan Admin dengan role SuperAdmin.'));
    }

    try {
        // 1. Cek apakah username sudah ada
        const existingSnapshot = await db.collection(ADMIN_COLLECTION)
            .where('username', '==', username)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            return next(new BadRequestError('Username sudah digunakan. Pilih username lain.'));
        }
        
        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Simpan Admin Baru ke Firestore
        const newAdminData = {
            username: username,
            email: email,
            passwordHash: passwordHash,
            role: role, 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdByAdminId: registeringAdminId, 
        };

        const docRef = await db.collection(ADMIN_COLLECTION).add(newAdminData);
        const adminId = docRef.id;

        // 4. Buat JWT untuk Admin baru
        const payload = {
            id: adminId,
            username: newAdminData.username,
            role: newAdminData.role,
        };
        const token = generateToken(payload);
        
        res.status(201).json({ 
            message: `Admin Pegawai baru (${username}) berhasil didaftarkan.`, 
            adminId: adminId,
            role: newAdminData.role,
            token: token
        });

    } catch (error) {
        console.error('Error saat mendaftarkan admin baru:', error);
        next(new InternalServerError('Gagal mendaftarkan admin baru.'));
    }
};


/**
 * Endpoint untuk Login Admin
 */
exports.loginAdmin = async (req, res, next) => {
    const { username, password } = req.body;

    try {
        // 1. Cari Admin berdasarkan username
        const snapshot = await db.collection(ADMIN_COLLECTION)
            .where('username', '==', username)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return next(new UnauthorizedError('Username atau password salah.'));
        }

        const adminDoc = snapshot.docs[0];
        const adminData = adminDoc.data();
        const adminId = adminDoc.id;

        // 2. Bandingkan Password
        const isMatch = await bcrypt.compare(password, adminData.passwordHash);
        
        if (!isMatch) {
            return next(new UnauthorizedError('Username atau password salah.'));
        }

        // 3. Buat JWT
        const payload = {
            id: adminId,
            username: adminData.username,
            role: adminData.role,
        };
        
        const token = generateToken(payload); 
        
        res.status(200).json({ 
            message: 'Login berhasil!', 
            token: token,
            admin: { id: adminId, username: adminData.username, role: adminData.role }
        });

    } catch (error) {
        console.error('Error saat login admin:', error);
        next(new InternalServerError('Gagal melakukan login.'));
    }
};