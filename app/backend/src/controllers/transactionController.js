// src/controllers/transactionController.js

// Import db dan admin DARI file konfigurasi yang sudah diinisialisasi
const { db, admin } = require('../config/db'); 
const { stringify } = require('csv-stringify'); // Pastikan package 'csv-stringify' sudah diinstal

// Helper function untuk mencatat log transaksi (DIPERLUKAN UNTUK SEMUA TRANSAKSI)
const logTransaction = async (productId, productName, type, quantity, oldStock, newStock, reason, recordedBy, orderId = null) => {
    try {
        const transactionRef = db.collection('transactions');
        await transactionRef.add({
            productId,
            productName,
            type, // 'IN' (masuk) atau 'OUT' (keluar/jual)
            quantity: Number(quantity),
            oldStock: Number(oldStock),
            newStock: Number(newStock),
            reason,
            recordedBy,
            orderId, // Hanya ada jika type='OUT' dari proses order
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        // Catat error ke console, tetapi jangan menghentikan proses utama
        console.error('Gagal mencatat log transaksi:', error.message);
    }
};

/**
 * @desc Mencatat stok masuk manual (Restock dari supplier, dll.)
 * @route POST /api/transactions/in
 * @access Admin
 */
const recordStockIn = async (req, res) => {
    const { productId, quantity, reason } = req.body;
    const recordedBy = req.user.uid; // ID Admin yang mencatat

    if (!productId || !quantity || !reason) {
        return res.status(400).json({ message: 'Semua field (productId, quantity, reason) wajib diisi.' });
    }

    try {
        // Gunakan transaction Firestore untuk memastikan update stok atomik
        const result = await db.runTransaction(async (transaction) => {
            const productRef = db.collection('products').doc(productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
                throw new Error('Produk tidak ditemukan.');
            }

            const data = productDoc.data();
            const currentStock = data.stock || 0;
            const newStock = currentStock + Number(quantity);
            const productName = data.name;

            // Update stok
            transaction.update(productRef, { stock: newStock, updated_at: admin.firestore.FieldValue.serverTimestamp() });

            return { productName, oldStock: currentStock, newStock };
        });

        // Catat log transaksi (di luar transaction atomik)
        await logTransaction(
            productId, 
            result.productName, 
            'IN', 
            quantity, 
            result.oldStock, 
            result.newStock, 
            result.newStock, // Mengganti quantity yang pertama kali dikirim
            reason, 
            recordedBy
        );

        res.status(201).json({ 
            message: 'Barang masuk berhasil dicatat. Stok baru:', 
            productId, 
            newStock: result.newStock 
        });

    } catch (error) {
        console.error('Error saat mencatat stok masuk:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Mencatat stok keluar manual (Barang rusak, hilang, dll.)
 * @route POST /api/transactions/out
 * @access Admin
 */
const recordStockOut = async (req, res) => {
    const { productId, quantity, reason } = req.body;
    const recordedBy = req.user.uid; // ID Admin yang mencatat

    if (!productId || !quantity || !reason) {
        return res.status(400).json({ message: 'Semua field (productId, quantity, reason) wajib diisi.' });
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            const productRef = db.collection('products').doc(productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
                throw new Error('Produk tidak ditemukan.');
            }

            const data = productDoc.data();
            const currentStock = data.stock || 0;
            const requestedQuantity = Number(quantity);

            if (currentStock < requestedQuantity) {
                // Gunakan error khusus untuk ditangkap oleh catch block atau ditangani di client
                const productName = data.name;
                throw new Error(`[BAD_REQUEST] Stok untuk produk ${productName} tidak mencukupi untuk ${requestedQuantity} unit. Stok saat ini: ${currentStock}.`);
            }

            const newStock = currentStock - requestedQuantity;
            const productName = data.name;

            // Update stok
            transaction.update(productRef, { stock: newStock, updated_at: admin.firestore.FieldValue.serverTimestamp() });

            return { productName, oldStock: currentStock, newStock };
        });

        // Catat log transaksi (di luar transaction atomik)
        await logTransaction(
            productId, 
            result.productName, 
            'OUT', 
            quantity, 
            result.oldStock, 
            result.newStock, 
            reason, 
            recordedBy
        );

        res.status(201).json({ 
            message: 'Barang keluar berhasil dicatat. Stok baru:', 
            productId, 
            newStock: result.newStock 
        });

    } catch (error) {
        console.error('Error saat mencatat stok keluar:', error);

        // Menangani error BAD_REQUEST untuk respons yang lebih bersih
        if (error.message.includes('[BAD_REQUEST]')) {
            return res.status(400).json({ message: error.message.replace('[BAD_REQUEST] ', '') });
        }
        res.status(500).json({ message: 'Server error: Gagal mencatat stok keluar.' });
    }
};

/**
 * @desc Mendapatkan semua laporan transaksi (Admin only)
 * @route GET /api/transactions
 * @access Admin
 */
const getAllTransactions = async (req, res) => {
    try {
        // FIX: Hapus .orderBy() untuk menghindari error index yang hilang
        const transactionsSnapshot = await db.collection('transactions').get(); 
        
        if (transactionsSnapshot.empty) {
            return res.status(200).json({ total: 0, transactions: [] });
        }

        let transactions = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Tambahkan field sementara untuk sorting di memory
                _timestamp: data.created_at ? data.created_at.toMillis() : 0, 
                // Mengonversi Timestamp Firebase menjadi string ISO untuk respons API
                created_at: data.created_at ? data.created_at.toDate().toISOString() : null,
                updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : null,
            };
        });

        // LAKUKAN SORTING DI MEMORY (Desc: Terbaru di atas)
        transactions.sort((a, b) => b._timestamp - a._timestamp);
        
        // Bersihkan field temporary _timestamp sebelum dikirim
        transactions = transactions.map(({ _timestamp, ...rest }) => rest);

        res.status(200).json({
            total: transactions.length,
            transactions
        });

    } catch (error) {
        console.error('Error saat mengambil laporan transaksi:', error);
        res.status(500).json({ message: 'Server error saat mengambil laporan transaksi.' });
    }
};


/**
 * @desc Mengkonversi data transaksi menjadi CSV dan mengirimkannya sebagai file
 * @route GET /api/transactions/export
 * @access Admin
 */
const exportTransactionsToCsv = async (req, res) => {
    try {
        // FIX: Hapus .orderBy() untuk menghindari error index yang hilang
        const transactionsSnapshot = await db.collection('transactions').get();

        if (transactionsSnapshot.empty) {
            return res.status(404).json({ message: 'Tidak ada data transaksi untuk diexport.' });
        }

        // 1. Ambil data dokumen dan siapkan untuk sorting
        let records = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Tambahkan field sementara untuk sorting
                timestamp: data.created_at ? data.created_at.toMillis() : 0, 
            };
        });

        // LAKUKAN SORTING DI MEMORY (Desc: Terbaru di atas)
        records.sort((a, b) => b.timestamp - a.timestamp);

        // 2. Siapkan Headers untuk file CSV
        const columns = [
            'ID Transaksi', 
            'Tipe', 
            'Nama Produk', 
            'Kuantitas', 
            'Stok Awal', 
            'Stok Akhir', 
            'Alasan', 
            'Dicatat Oleh User ID', 
            'Tanggal Dibuat'
        ];

        // 3. Format Data ke bentuk Array of Arrays (sesuai urutan columns)
        const csvData = records.map(data => [
            data.id,
            data.type,
            data.productName,
            data.quantity,
            data.oldStock,
            data.newStock,
            data.reason,
            data.recordedBy,
            data.created_at ? new Date(data.created_at.seconds * 1000).toLocaleString('id-ID') : 'N/A' // Format tanggal ke lokal Indonesia
        ]);
        
        // Tambahkan header ke data
        csvData.unshift(columns);

        // 4. Konversi ke String CSV
        stringify(csvData, (err, output) => {
            if (err) {
                console.error("CSV Stringify Error:", err);
                return res.status(500).json({ message: 'Gagal mengkonversi data ke CSV.', error: err.message });
            }

            // 5. Set Header untuk Download File
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=laporan_inventaris_${new Date().toISOString().slice(0, 10)}.csv`);
            
            // 6. Kirim file
            res.status(200).send(output);
        });

    } catch (error) {
        console.log('Error saat export transaksi:', error);
        res.status(500).json({ message: 'Server error saat memproses export.', error: error.message });
    }
};


module.exports = {
    logTransaction,
    recordStockIn,
    recordStockOut,
    getAllTransactions,
    exportTransactionsToCsv, 
};