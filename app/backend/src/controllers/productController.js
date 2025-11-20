// src/controllers/productController.js

const { customError } = require('../utils/customError');
// FIX KRUSIAL: Import db (instance Firestore) dan admin (Admin SDK) dari config
const { db, admin } = require('../config/db'); 

// Definisikan referensi ke koleksi 'products'
const productsCollection = db.collection('products');


// ==========================================================
// FUNGSI UTILITY
// ==========================================================

/**
 * Validasi apakah input adalah angka valid (float) dan non-negatif/positif.
 * Melempar customError jika gagal.
 */
const validatePriceAndStock = (price, stock, next) => {
    
    const numericPrice = price !== undefined ? parseFloat(price) : undefined;
    const numericStock = stock !== undefined ? parseInt(stock) : undefined;

    if (numericPrice !== undefined) {
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return next(customError('Harga produk harus berupa angka positif yang valid.', 400));
        }
    }
    
    if (numericStock !== undefined) {
        // Cek NaN, non-negatif, dan integer (karena stock harus bulat)
        if (isNaN(numericStock) || numericStock < 0 || !Number.isInteger(numericStock)) {
            return next(customError('Stok produk harus berupa bilangan bulat positif atau nol.', 400));
        }
    }
    
    // Kembalikan nilai yang sudah diparsing
    return { numericPrice, numericStock };
};

// ==========================================================
// RUTE PUBLIK (READ)
// ==========================================================

// GET /api/products/
const getAllProducts = async (req, res, next) => {
    try {
        // Mendapatkan semua dokumen dari koleksi
        const snapshot = await productsCollection.get(); 
        
        if (snapshot.empty) {
            // Mengembalikan array kosong jika tidak ada produk
            return res.status(200).json([]);
        }

        let products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sorting di memori berdasarkan nama secara ascending (praktik terbaik Firestore)
        // Perhatian: properti created_at/updated_at akan berupa Timestamp objek, bukan Date
        products.sort((a, b) => a.name.localeCompare(b.name));

        res.status(200).json(products);
    } catch (err) {
        console.error('Error saat mengambil semua produk dari Firestore:', err);
        next(customError('Gagal mengambil data produk dari database.', 500));
    }
};

// GET /api/products/:id
const getProductById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const docSnapshot = await productsCollection.doc(id).get(); 

        if (!docSnapshot.exists) {
            return next(customError('Produk tidak ditemukan.', 404));
        }
        
        res.status(200).json({ 
            id: docSnapshot.id,
            ...docSnapshot.data()
        });
    } catch (err) {
        console.error(`Error saat mengambil produk ID ${id} dari Firestore:`, err);
        next(customError('Gagal mengambil data produk.', 500));
    }
};

// ==========================================================
// RUTE ADMIN (CREATE, UPDATE, DELETE)
// ==========================================================

// POST /api/products/
const createProduct = async (req, res, next) => {
    const { 
        name, 
        description, 
        price, 
        stock,
        image_url, 
        category, 
        is_customizable 
    } = req.body;
    
    // 1. Validasi input minimal
    if (!name || price === undefined || stock === undefined) { 
        return next(customError('Nama, harga, dan stock wajib diisi.', 400)); 
    }

    // 2. Validasi Tipe Data
    const validationResult = validatePriceAndStock(price, stock, next);
    if (!validationResult) return; 

    const { numericPrice, numericStock } = validationResult;
    
    // 3. Siapkan Objek Data Firestore
    const newProductData = {
        name, 
        description: description || '', 
        price: numericPrice, 
        stock: numericStock, 
        image_url: image_url || '',
        category: category || null, 
        is_customizable: is_customizable === undefined ? false : is_customizable,
        // FIX: Menggunakan Server Timestamp
        created_at: admin.firestore.FieldValue.serverTimestamp(), 
        updated_at: admin.firestore.FieldValue.serverTimestamp(), 
    };
    
    try {
        // Menggunakan .add() untuk menambahkan dokumen baru
        const docRef = await productsCollection.add(newProductData); 
        
        // Ambil data yang baru disimpan untuk mendapatkan timestamp yang valid (opsional, tapi lebih baik)
        const newDoc = await docRef.get();

        res.status(201).json({ 
            message: 'Produk berhasil dibuat.',
            product: { id: docRef.id, ...newDoc.data() }
        });
    } catch (err) {
        console.error('Error saat membuat produk baru di Firestore:', err);
        next(customError('Gagal membuat produk baru.', 500));
    }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const { price, stock } = req.body; 
    const updates = req.body; // Ambil semua data update

    // 1. Validasi pembaruan minimal
    if (Object.keys(updates).length === 0) {
        return next(customError('Setidaknya satu field harus diisi untuk pembaruan.', 400));
    }

    // 2. Validasi Tipe Data
    let numericPrice, numericStock;
    if (price !== undefined || stock !== undefined) {
        const validationResult = validatePriceAndStock(price, stock, next);
        if (!validationResult) return;
        numericPrice = validationResult.numericPrice;
        numericStock = validationResult.numericStock;
    }
    
    try {
        // 3. Siapkan Objek Pembaruan
        // FIX: Menggunakan Server Timestamp
        const updateData = { updated_at: admin.firestore.FieldValue.serverTimestamp() };

        // Pindahkan data body yang valid ke updateData
        for (const key in updates) {
            if (updates[key] !== undefined) {
                 updateData[key] = updates[key];
            }
        }

        // Terapkan nilai numerik yang sudah divalidasi
        if (numericPrice !== undefined) updateData.price = numericPrice;
        if (numericStock !== undefined) updateData.stock = numericStock;
        
        // 4. Periksa apakah dokumen ada sebelum diperbarui
        const docRef = productsCollection.doc(id);
        const docSnapshot = await docRef.get();
        
        if (!docSnapshot.exists) {
            return next(customError('Produk tidak ditemukan.', 404));
        }

        // 5. Update
        await docRef.update(updateData);
        
        // Ambil data terbaru setelah update
        const updatedDoc = await docRef.get();
        
        res.status(200).json({ 
            message: 'Produk berhasil diperbarui.',
            product: { id: updatedDoc.id, ...updatedDoc.data() }
        });

    } catch (err) {
        console.error(`Error saat memperbarui produk ID ${id} di Firestore:`, err);
        next(customError('Gagal memperbarui produk.', 500));
    }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
    const { id } = req.params;

    try {
        const docRef = productsCollection.doc(id);
        const docSnapshot = await docRef.get();
        
        if (!docSnapshot.exists) {
            return next(customError('Produk tidak ditemukan.', 404));
        }

        // Hard Delete
        await docRef.delete();
        
        res.status(200).json({ message: 'Produk berhasil dihapus.' });
    } catch (err) {
        console.error(`Error saat menghapus produk ID ${id} dari Firestore:`, err);
        next(customError('Gagal menghapus produk.', 500));
    }
};


module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};