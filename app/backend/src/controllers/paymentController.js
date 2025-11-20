// src/controllers/paymentController.js
// Logika yang diperbarui untuk menggunakan Firebase Firestore.
// Ini mengasumsikan orderController.js sudah selesai dimigrasi.

const { customError } = require('../utils/customError'); 
const { db, admin } = require('../config/db'); 

// Definisikan referensi koleksi
const ordersCollection = db.collection('orders');
const paymentsCollection = db.collection('payments'); // Koleksi baru untuk mencatat riwayat pembayaran

/**
 * Fungsi untuk memulai proses pembayaran.
 * Ini adalah placeholder, hanya memberikan respons sukses palsu.
 */
const initiatePayment = async (req, res, next) => {
    const { order_id } = req.body;
    
    if (!order_id) {
        return next(customError('order_id wajib diisi untuk memulai pembayaran.', 400));
    }

    // DI SINI AKAN ADA LOGIKA ASLI MIDTRANS/XENDIT UNTUK MEMBUAT SNAP TOKEN.
    // Untuk saat ini, kita akan melewati verifikasi ID order di database (karena sudah diverifikasi di frontend)
    // dan langsung memberikan respons token palsu.

    // Placeholder Response (Simulasi sukses)
    res.status(200).json({
        message: 'Endpoint initiatePayment berhasil dipanggil. Siap untuk integrasi payment gateway (DITUNDA).',
        order_id: order_id,
        transaction_token: 'DUMMY-TRANSACTION-TOKEN-12345',
        // Tambahkan URL callback dummy agar user tahu ke mana harus 'trigger' webhook
        webhook_trigger: `/api/payments/webhook` 
    });
};

/**
 * Fungsi untuk menangani notifikasi pembayaran dari Payment Gateway (Webhook).
 * Webhook ini akan bertanggung jawab untuk memperbarui status order di Firestore.
 * * CATATAN: Dalam implementasi asli, data yang diterima dari Midtrans/Xendit 
 * akan berisi status, transaction_id, dan order_id.
 */
const handleWebhook = async (req, res) => {
    
    // Asumsi: data webhook yang diterima memiliki order_id dan status pembayaran
    const { order_id, transaction_status, transaction_id, gross_amount } = req.body;
    
    // --- SIMULASI VERIFIKASI DATA MIDTRANS ---
    // Di dunia nyata, Anda harus memverifikasi signature hash dari Midtrans di sini.
    // Jika verifikasi gagal, Anda harus mengirim 500.
    
    if (!order_id || !transaction_status) {
        console.error('[WEBHOOK ERROR] Notifikasi tidak memiliki order_id atau status.');
        return res.status(400).send('Data notifikasi tidak lengkap.');
    }
    
    console.log(`[WEBHOOK] Menerima notifikasi untuk Order ID: ${order_id} dengan Status: ${transaction_status}`);

    // Kita hanya tertarik pada status sukses (Paid)
    const isPaymentSuccessful = transaction_status === 'settlement' || transaction_status === 'capture';

    try {
        const orderRef = ordersCollection.doc(order_id);
        
        // 1. Cek keberadaan order
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            console.error(`[WEBHOOK ERROR] Order ID ${order_id} tidak ditemukan di Firestore.`);
            // Gateway harus tetap menerima 200 agar tidak mencoba kirim ulang
            return res.status(200).send('Order tidak ditemukan, notifikasi diabaikan.'); 
        }

        const orderData = orderDoc.data();
        
        // Cek jika status order sudah Paid/Cancelled (hindari pemrosesan ganda)
        if (orderData.status === 'Paid' || orderData.status === 'Cancelled') {
            console.warn(`[WEBHOOK WARN] Order ID ${order_id} sudah diproses.`);
            return res.status(200).send('Status sudah terbarui, notifikasi diabaikan.');
        }

        if (isPaymentSuccessful) {
            // 2. Catat Riwayat Pembayaran ke Koleksi 'payments'
            const paymentData = {
                order_id: order_id,
                transaction_id: transaction_id || `DUMMY-TXN-${Date.now()}`,
                gross_amount: gross_amount || orderData.total_amount,
                payment_method: orderData.payment_method,
                status: transaction_status,
                payment_date: new Date(),
            };
            await paymentsCollection.add(paymentData);
            
            // 3. Perbarui Status Order di Koleksi 'orders'
            await orderRef.update({
                status: 'Paid',
                payment_details: {
                    transaction_id: paymentData.transaction_id,
                    amount_paid: paymentData.gross_amount,
                    date: paymentData.payment_date
                },
                updated_at: new Date()
            });

            console.log(`[WEBHOOK SUCCESS] Order ID ${order_id} berhasil diperbarui menjadi Paid.`);

        } else if (transaction_status === 'expire' || transaction_status === 'deny') {
            // Jika pembayaran gagal atau kadaluarsa
            await orderRef.update({
                status: 'Cancelled',
                updated_at: new Date()
            });
            console.log(`[WEBHOOK INFO] Order ID ${order_id} dibatalkan karena: ${transaction_status}.`);
        }
        
        // Wajib status 200 agar payment gateway menganggap notifikasi berhasil terkirim
        res.status(200).send('Webhook diterima dan diproses.');

    } catch (err) {
        console.error(`[WEBHOOK CRITICAL ERROR] Gagal memproses Order ID ${order_id} di Firestore:`, err);
        // Tetap kirim 200 untuk mencegah pengiriman ulang yang terus-menerus
        res.status(200).send('Terjadi error saat pemrosesan, silakan cek log server.');
    }
};

module.exports = {
    initiatePayment,
    handleWebhook
};