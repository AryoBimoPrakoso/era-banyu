// src/routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// ==========================================================
// RUTE PELANGGAN (MEMERLUKAN LOGIN)
// ==========================================================

// POST /api/orders/
// Membuat pesanan baru (hanya perlu login)
router.post('/', 
    authenticateToken, 
    orderController.createOrder
);

// GET /api/orders/my
// Mengambil semua pesanan milik user yang sedang login
router.get('/my', 
    authenticateToken, 
    orderController.getOrdersByUser
);

// GET /api/orders/:id
// Mengambil detail pesanan berdasarkan ID (user hanya bisa melihat miliknya sendiri)
router.get('/:id', 
    authenticateToken, 
    orderController.getOrderById
);

// ==========================================================
// RUTE ADMIN (MEMERLUKAN AUTHENTIKASI DAN PERAN 'admin')
// ==========================================================

// GET /api/orders/
// Mengambil SEMUA pesanan (hanya untuk Admin)
router.get('/', 
    authenticateToken, 
    authorizeRole('admin'), 
    orderController.getAllOrders
);

// PUT /api/orders/:id/status
// Memperbarui status pesanan (hanya untuk Admin)
router.put('/:id/status', 
    authenticateToken, 
    authorizeRole('admin'), 
    orderController.updateOrderStatus
);

module.exports = router;