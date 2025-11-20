// server.js (Sekarang berada di app/backend/server.js)
const express = require('express');
const app = express();
const cors = require('cors'); 
const path = require('path');

// PERBAIKAN: Menetapkan jalur file .env secara eksplisit menggunakan path.join
require('dotenv').config({ path: path.join(__dirname, '.env') }); 

// Import koneksi DB 
// Cukup di-require agar inisialisasi Firebase berjalan
require('./src/config/db'); 

const { errorHandler } = require('./src/middleware/errorMiddleware'); 

// Import Routes
const authRoutes = require('./src/routes/authRoutes'); 
const productRoutes = require('./src/routes/productRoutes'); 
const orderRoutes = require('./src/routes/orderRoutes'); 
const transactionRoutes = require('./src/routes/transactionRoutes'); 


// ==========================================================
// MIDDLEWARE CORS 
// ==========================================================
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================================
// BODY PARSERS MIDDLEWARE
// ==========================================================
// 1. Parser untuk data JSON
app.use(express.json()); 
// 2. Parser untuk data URL-encoded (form submission) - Ditambahkan untuk best practice
app.use(express.urlencoded({ extended: true }));


// Root Route Test
app.get('/', (req, res) => {
    res.send('PT Era Banyu Segara API is running!'); 
});

// Implementasi Routes
app.use('/api/auth', authRoutes); 
app.use('/api/products', productRoutes); 
app.use('/api/orders', orderRoutes); 
app.use('/api/transactions', transactionRoutes); // Rute Transaksi Didaftarkan

// ==========================================================
// ERROR HANDLING MIDDLEWARE
// ==========================================================
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3001; 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});