// src/controllers/authController.js

// FIX KRUSIAL: Mengambil db (instance Firestore) dan admin (instance Admin SDK) dari config
const { db, admin } = require('../config/db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Diperlukan untuk membuat token reset
const { transporter } = require('../config/emailConfig'); // Diperlukan untuk mengirim email

// Definisikan referensi ke koleksi 'users'
// db kini adalah instance Firestore, sehingga .collection() dapat dipanggil
const usersCollection = db.collection('users');

// ==========================================================
// FUNGSI UTAMA: REGISTER
// ==========================================================
const register = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password harus diisi.' });
    }

    try {
        // 1. Cek apakah user sudah ada
        const existingUser = await usersCollection
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existingUser.empty) {
            return res.status(409).json({ error: 'Email sudah terdaftar.' });
        }

        // 2. Hash password sebelum disimpan
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 3. Buat dokumen user baru di Firestore
        const newUserRef = await usersCollection.add({
            email,
            passwordHash, // Simpan hash
            role: 'user', // Default role untuk registrasi adalah 'user'
            // FIX: Menggunakan Server Timestamp untuk waktu yang akurat
            created_at: admin.firestore.FieldValue.serverTimestamp(), 
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 4. Buat Token
        const token = jwt.sign(
            { id: newUserRef.id, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            message: 'Registrasi berhasil! Akun telah dibuat.',
            token,
            role: 'user',
            id: newUserRef.id,
        });

    } catch (err) {
        console.error('Terjadi error saat proses registrasi user:', err);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat registrasi.' });
    }
};


// ==========================================================
// FUNGSI UTAMA: LOGIN
// ==========================================================
const login = async (req, res) => {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password harus diisi.' });
    }

    try {
        // 1. Cari user di Database berdasarkan email
        const snapshot = await usersCollection
            .where('email', '==', email)
            .limit(1)
            .get();

        // Jika user tidak ditemukan
        if (snapshot.empty) {
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }
        
        const userDoc = snapshot.docs[0];
        const user = userDoc.data();
        const userId = userDoc.id;
        
        // 2. Bandingkan password yang dimasukkan dengan hash di DB
        const storedHash = user.passwordHash;
        const match = await bcrypt.compare(password, storedHash);
        
        // Jika password tidak cocok
        if (!match) {
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }

        // 3. Buat JSON Web Token (JWT)
        const token = jwt.sign(
            { id: userId, role: user.role }, 
            process.env.JWT_SECRET,
            { expiresIn: '1d' } 
        );

        // 4. Kirim token ke client
        res.status(200).json({ 
            message: 'Login berhasil!', 
            token, 
            role: user.role,
            id: userId
        });

    } catch (err) {
        console.error('Terjadi error saat proses login dengan Firestore:', err);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat login.' });
    }
};

// ==========================================================
// FUNGSI BARU: LUPA PASSWORD (Mengirim Link Reset)
// ==========================================================
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email wajib diisi.' });
    }

    try {
        // 1. Cari user di Database
        const snapshot = await usersCollection
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Selalu kirim respons sukses agar tidak membocorkan data email mana yang terdaftar.
            return res.status(200).json({ message: 'Jika email terdaftar, link reset telah dikirim.' });
        }
        
        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;

        // 2. Buat token reset dan masa kedaluwarsa (1 jam)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

        // 3. Simpan token dan masa kedaluwarsa di dokumen user
        await usersCollection.doc(userId).update({
            resetToken,
            resetTokenExpires,
            updated_at: admin.firestore.FieldValue.serverTimestamp(), // FIX: Menggunakan Server Timestamp
        });

        // 4. Buat URL reset (GANTI INI DENGAN URL FRONTEND ASLI ANDA!)
        const resetUrl = `http://localhost:8080/reset-password?token=${resetToken}&id=${userId}`;

        // 5. Kirim Email
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'no-reply@ecommerceapp.com',
            to: email,
            subject: 'Permintaan Reset Kata Sandi',
            html: `
                <p>Anda menerima email ini karena Anda (atau seseorang) telah meminta reset kata sandi.</p>
                <p>Silakan klik link berikut untuk mengatur kata sandi baru:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
                <p>Jika Anda tidak meminta reset ini, abaikan email ini.</p>
            `,
        };
        
        if (!transporter) {
             console.warn('Transporter email tidak tersedia. Email tidak terkirim.');
             return res.status(500).json({ error: 'Layanan email tidak tersedia.' });
        }

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Link reset kata sandi telah dikirim ke email Anda.' });

    } catch (err) {
        console.error('Error saat Forgot Password:', err);
        // Error 500 jika gagal, tapi pesan tetap samar jika terjadi masalah email
        res.status(500).json({ error: 'Gagal memproses permintaan reset password.' });
    }
};

// ==========================================================
// FUNGSI BARU: RESET PASSWORD (Memperbarui Password Baru)
// ==========================================================
const resetPassword = async (req, res) => {
    const { token, id, newPassword } = req.body;

    if (!token || !id || !newPassword) {
        return res.status(400).json({ error: 'Token, ID user, dan kata sandi baru wajib diisi.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    }

    try {
        // 1. Cari user berdasarkan ID
        const docRef = usersCollection.doc(id);
        const userDoc = await docRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        }

        const user = userDoc.data();
        
        // 2. Validasi Token dan Waktu Kedaluwarsa
        if (user.resetToken !== token || !user.resetTokenExpires) {
            return res.status(400).json({ error: 'Token reset tidak valid atau sudah digunakan.' });
        }

        // Konversi timestamp Firestore menjadi objek Date JavaScript untuk perbandingan
        const expirationDate = user.resetTokenExpires.toDate(); 

        if (expirationDate < new Date()) {
            // Hapus token kedaluwarsa dan update timestamp
            await docRef.update({ 
                resetToken: null, 
                resetTokenExpires: null,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            }); 
            return res.status(400).json({ error: 'Token reset sudah kedaluwarsa.' });
        }

        // 3. Hash password baru
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. Perbarui password dan hapus token reset
        await docRef.update({
            passwordHash,
            resetToken: null, 
            resetTokenExpires: null, 
            updated_at: admin.firestore.FieldValue.serverTimestamp(), // FIX: Menggunakan Server Timestamp
        });

        res.status(200).json({ message: 'Kata sandi berhasil direset. Silakan login.' });

    } catch (err) {
        console.error('Error saat Reset Password:', err);
        res.status(500).json({ error: 'Gagal mereset kata sandi.' });
    }
};


module.exports = {
    login,
    register,
    forgotPassword,
    resetPassword,
};