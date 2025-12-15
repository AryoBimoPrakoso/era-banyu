/**
 * Express Router untuk mengelola rute pesanan (orders) yang difokuskan pada operasi Admin.
 * Semua rute ini memerlukan otentikasi (verifyToken) dan otorisasi (verifyAdmin/verifySuperAdmin).
 */
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Asumsi: authMiddleware menyediakan verifikasi token dasar, verifikasi peran Admin, dan SuperAdmin
// Pastikan path ke middleware sudah benar
const { verifyToken, verifyAdmin, verifySuperAdmin } = require('../middleware/authMiddleware'); 

// ===================================
// ADMIN ROUTES (PROTECTED) - PREFIX: /api/v1/admin/orders
// ===================================

// 1. Input Manual Pesanan BARU 
// POST /
// Fungsi: createManualOrder, mencakup stok keluar jika statusnya Diproses/Selesai
router.post('/', verifyToken, verifyAdmin, orderController.createManualOrder);

// 2. Ambil Semua Pesanan (Dapat difilter berdasarkan status & export ke Excel)
// GET /
// Fungsi: getAllOrders
router.get('/', verifyToken, verifyAdmin, orderController.getAllOrders);

// 3. Ambil Detail Satu Pesanan 
// GET /:id
// Fungsi: getOrderById
router.get('/:id', verifyToken, verifyAdmin, orderController.getOrderById);

// 4. Update Detail Pesanan (Non-Status: Nama, Kontak, Detail Produk, Biaya Kirim, Tanggal)
// PUT /:id
// Fungsi: updateOrder (Perhitungan total & detail diurus di controller)
router.put('/:id', verifyToken, verifyAdmin, orderController.updateOrder); 

// 5. Update Status Pesanan SAJA (Termasuk Logika Pemotongan/Pengembalian Stok)
// PATCH /:id/status
// Fungsi: updateOrderStatus
router.patch('/:id/status', verifyToken, verifyAdmin, orderController.updateOrderStatus);

// 6. Hapus Pesanan (HARUS status Pending atau Batal, memerlukan otorisasi SuperAdmin)
// DELETE /:id
// Fungsi: deleteOrder
router.delete('/:id', verifyToken, verifySuperAdmin, orderController.deleteOrder); 


module.exports = router;