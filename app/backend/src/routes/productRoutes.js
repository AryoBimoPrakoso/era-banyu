// src/routes/productRoutes.js

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// ==========================================================
// RUTE PUBLIK (TIDAK MEMERLUKAN LOGIN)
// ==========================================================

// GET /api/products/
// Mengambil semua produk (untuk tampilan di website/aplikasi)
router.get('/', productController.getAllProducts);

// GET /api/products/:id
// Mengambil produk berdasarkan ID
router.get('/:id', productController.getProductById);

// ==========================================================
// RUTE ADMIN (MEMERLUKAN AUTHENTIKASI DAN PERAN 'admin')
// ==========================================================

// POST /api/products/
// Membuat produk baru. Membutuhkan token yang valid DAN peran 'admin'.
router.post('/', 
    authenticateToken, 
    authorizeRole('admin'), 
    productController.createProduct
);

// PUT /api/products/:id
// Memperbarui produk berdasarkan ID. Membutuhkan token yang valid DAN peran 'admin'.
router.put('/:id', 
    authenticateToken, 
    authorizeRole('admin'), 
    productController.updateProduct
);

// DELETE /api/products/:id
// Menghapus produk berdasarkan ID. Membutuhkan token yang valid DAN peran 'admin'.
router.delete('/:id', 
    authenticateToken, 
    authorizeRole('admin'), 
    productController.deleteProduct
);


module.exports = router;