// routes/adminRoutes.js

const express = require('express');
const router = express.Router();

// PENTING: Import authorizeRoles dari middleware
const { authorizeRoles } = require('../middleware/authMiddleware'); 
const orderController = require('../controllers/orderController');
// inventoryController TIDAK diimpor lagi karena semua rute inventaris dipindahkan

// Catatan: Middleware verifyAdmin sudah diterapkan di server.js untuk router ini.

// Daftar peran yang diizinkan untuk operasional umum (Editor dan SuperAdmin)
const OPERATIONAL_ROLES = ['SuperAdmin', 'editor'];


// ===========================================
// RUTE ADMIN: DASHBOARD & INVENTORY (DIPINDAHKAN KE inventoryRoutes.js)
// ===========================================

/*
 * Semua rute yang terkait dengan inventoryController telah dihapus dari file ini 
 * (Dashboard, Laporan Inventaris, Live Stock, Export, Transaksi Masuk/Keluar, Penyesuaian Stok).
 * Rute-rute tersebut sekarang dikelola di file src/routes/inventoryRoutes.js.
*/


// ===========================================
// RUTE ADMIN: ORDER MANAGEMENT
// ===========================================

// 1. Ambil semua pesanan (GET /api/v1/admin/orders)
router.get('/orders', authorizeRoles(...OPERATIONAL_ROLES), orderController.getAllOrders); 

// 2. Update Status Pesanan (PATCH /api/v1/admin/orders/:id/status)
router.patch('/orders/:id/status', authorizeRoles(...OPERATIONAL_ROLES), orderController.updateOrderStatus);

module.exports = router;