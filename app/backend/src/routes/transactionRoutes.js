const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware'); // Menggunakan nama middleware Anda

// ==========================================================
// RUTE ADMIN (MEMERLUKAN AUTHENTIKASI DAN PERAN 'admin')
// ==========================================================

// POST /api/transactions/in
// Mencatat barang masuk dan menambah stok
router.post('/in', 
    authenticateToken, 
    authorizeRole('admin'), 
    transactionController.recordStockIn
);

// POST /api/transactions/out
// Mencatat barang keluar (non-penjualan) dan mengurangi stok
router.post('/out', 
    authenticateToken, 
    authorizeRole('admin'), 
    transactionController.recordStockOut
);

// GET /api/transactions
// Mendapatkan laporan barang keluar & masuk (Semua Transaksi)
router.get('/', 
    authenticateToken, 
    authorizeRole('admin'), 
    transactionController.getAllTransactions
);

// GET /api/transactions/export
// Rute BARU: Mengkonversi laporan ke CSV dan memicu download (Admin only)
router.get('/export',
    authenticateToken,
    authorizeRole('admin'),
    transactionController.exportTransactionsToCsv
);

module.exports = router;