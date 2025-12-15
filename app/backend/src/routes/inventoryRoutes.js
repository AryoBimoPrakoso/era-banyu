/**
 * Express Router untuk mengelola rute Inventaris (Live Stock, Transaksi, Laporan, Dashboard).
 * Rute-rute ini dilindungi oleh middleware 'authorizeRoles' untuk memastikan hak akses yang sesuai.
 */
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Asumsi: authorizeRoles adalah middleware yang memverifikasi token dan peran pengguna.
const { authorizeRoles } = require('../middleware/authMiddleware'); 

// Daftar peran yang diizinkan untuk operasional umum (bisa melihat laporan & dashboard)
const OPERATIONAL_ROLES = ['SuperAdmin', 'editor'];
// Daftar peran yang diizinkan untuk operasional tingkat tinggi (bisa update stok manual)
const SUPERADMIN_ROLE = ['SuperAdmin'];

// ===================================
// ADMIN INVENTORY ROUTES (PREFIX: /api/v1/admin/inventory)
// ===================================

// 1. Dashboard Data (Ringkasan KPI)
// GET /api/v1/admin/inventory/dashboard
router.get(
    '/dashboard', 
    authorizeRoles(...OPERATIONAL_ROLES), 
    inventoryController.getDashboardData
);

// 2. Pencatatan Barang Masuk Manual (Pembelian, dll.)
// POST /api/v1/admin/inventory/in
router.post(
    '/in', 
    authorizeRoles(...OPERATIONAL_ROLES), 
    (req, res, next) => {
        req.params.type = 'Masuk'; // Set tipe transaksi untuk controller
        next();
    }, 
    inventoryController.createInventoryTransaction
);

// 3. Pencatatan Barang Keluar Manual (Kerusakan, Sampel, dll.)
// POST /api/v1/admin/inventory/out
router.post(
    '/out', 
    authorizeRoles(...SUPERADMIN_ROLE), 
    (req, res, next) => {
        req.params.type = 'Keluar'; // Set tipe transaksi untuk controller
        next();
    }, 
    inventoryController.createInventoryTransaction
);

// 4. Laporan Barang Masuk & Keluar (Historis Transaksi)
// GET /api/v1/admin/inventory/report
router.get(
    '/report', 
    authorizeRoles(...OPERATIONAL_ROLES), 
    inventoryController.getInventoryReport
); 

// 5. Export Laporan ke Excel
// GET /api/v1/admin/inventory/report/export
router.get(
    '/report/export', 
    authorizeRoles(...OPERATIONAL_ROLES), 
    inventoryController.exportReportToExcel
);

// 6. Laporan Stok Aktif (Live Stock)
// GET /api/v1/admin/inventory/live
router.get(
    '/live', 
    authorizeRoles(...OPERATIONAL_ROLES), 
    inventoryController.getLiveStockReport
);

// 7. Rute Penyesuaian Stok Cepat (Manual Update Stok Produk)
// PATCH /api/v1/admin/inventory/stock/:productId
router.patch(
    '/stock/:productId', 
    authorizeRoles(...SUPERADMIN_ROLE), 
    inventoryController.updateProductStock
);


module.exports = router;