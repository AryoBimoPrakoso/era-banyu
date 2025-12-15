// src/routes/productRoutes.js

const express = require('express');
const router = express.Router();

// Import Controller
const productController = require('../controllers/productController'); 

// PENTING: Import kedua middleware untuk verifikasi token dan otorisasi peran
const { verifyAdmin, authorizeRoles } = require('../middleware/authMiddleware'); 

// Daftar peran
const OPERATIONAL_ROLES = ['SuperAdmin', 'editor'];
const SUPERADMIN_ROLE = ['SuperAdmin'];


// ===================================
// PUBLIC ROUTES
// Rute ini tidak terproteksi dan melayani customer
// ===================================
// GET /api/v1/products
router.get('/', productController.getPublicProducts);
// GET /api/v1/products/:id 
router.get('/:id', productController.getProductById); 


// ===================================
// ADMIN ROUTES (PROTECTED)
// Catatan: Semua route di bawah ini akan diakses melalui prefix /api/v1/admin/products
// ===================================

// Middleware diterapkan untuk semua rute admin di bawah ini (Verifikasi Token Wajib)
router.use(verifyAdmin); 

// 1. CREATE: POST /api/v1/admin/products
// Hanya SuperAdmin yang dapat membuat produk baru
router.post('/', authorizeRoles(...OPERATIONAL_ROLES), productController.createProduct); 

// 2. READ All: GET /api/v1/admin/products
// Boleh diakses oleh Admin Operasional
router.get('/', authorizeRoles(...OPERATIONAL_ROLES), productController.getAllProductsAdmin); 

// 3. READ One: GET /api/v1/admin/products/:id
// Boleh diakses oleh Admin Operasional
router.get('/:id', authorizeRoles(...OPERATIONAL_ROLES), productController.getProductById); 

// 4. UPDATE: PUT /api/v1/admin/products/:id
// Hanya SuperAdmin yang dapat mengedit produk
router.put('/:id', authorizeRoles(...SUPERADMIN_ROLE), productController.updateProduct); 

// 5. DELETE: DELETE /api/v1/admin/products/:id
// Hanya SuperAdmin yang dapat menghapus produk
router.delete('/:id', authorizeRoles(...SUPERADMIN_ROLE), productController.deleteProduct); 

module.exports = router;