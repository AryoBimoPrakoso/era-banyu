// src/controllers/productController.js

const { db, admin } = require('../config/db'); 
const { NotFoundError, BadRequestError } = require('../utils/customError'); 
const PRODUCT_COLLECTION = 'products';

// ===================================
// PUBLIC API: GET /api/v1/products
// ===================================

/**
 * Mengambil semua produk yang aktif (isActive: true) untuk tampilan publik.
 * GET /api/v1/products
 */
exports.getPublicProducts = async (req, res, next) => {
    try {
        // Query hanya mengambil produk yang aktif
        const snapshot = await db.collection(PRODUCT_COLLECTION)
            .where('isActive', '==', true)
            .get();

        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(products);
    } catch (error) {
        next(error); // Teruskan ke error middleware
    }
};

// ===================================
// ADMIN API: CRUD (Membutuhkan Token)
// ===================================

// 1. CREATE: POST /api/v1/admin/products
/**
 * Membuat produk baru di Firestore.
 */
exports.createProduct = async (req, res, next) => {
    const { 
        name, 
        sku, 
        minOrderQuantity, 
        unit,
        price,
        category, 
        currentStock, 
        minStockLevel, 
        specification, 
        description, 
        imageUrl 
    } = req.body;
    
    // Validasi dasar
    if (!name || !sku || !minOrderQuantity || !unit || !price) {
        return next(new BadRequestError('Nama Produk, SKU, Kuantitas Minimum Order, Unit, dan Harga wajib diisi.'));
    }

    try {
        // Pengecekan Duplikasi SKU (penting untuk inventaris)
        const existingSku = await db.collection(PRODUCT_COLLECTION)
            .where('sku', '==', sku)
            .limit(1)
            .get();
        
        if (!existingSku.empty) {
            return next(new BadRequestError(`SKU Produk ${sku} sudah terdaftar. Gunakan SKU yang unik.`));
        }

        // Mapping dan Konversi Angka
        const newProduct = {
            name: name, 
            sku: sku,
            category: category || 'General', 
            minOrderQuantity: Number(minOrderQuantity), 
            unit: unit,
            price: Number(price), 
            
            // Field Inventaris Default
            currentStock: Number(currentStock) || 0,
            minStockLevel: Number(minStockLevel) || 0, 

            specification: specification || '',
            description: description || '',
            imageUrl: imageUrl || '',
            isActive: true, // Default aktif
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection(PRODUCT_COLLECTION).add(newProduct);

        res.status(201).json({ 
            success: true,
            message: 'Produk berhasil ditambahkan.', 
            productId: docRef.id,
            // Kembalikan data dengan ID dokumen baru
            product: { id: docRef.id, ...newProduct } 
        });
    } catch (error) {
        next(error); 
    }
};

// 2. READ All (Admin View): GET /api/v1/admin/products
/**
 * Mengambil semua produk (aktif dan non-aktif) untuk dashboard admin.
 */
exports.getAllProductsAdmin = async (req, res, next) => {
    try {
        // Ambil semua produk, termasuk yang tidak aktif
        const snapshot = await db.collection(PRODUCT_COLLECTION).get();
        
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(products);
    } catch (error) {
        next(error);
    }
};

// 3. READ One: GET /api/v1/admin/products/:id
/**
 * Mengambil detail produk berdasarkan ID.
 */
exports.getProductById = async (req, res, next) => {
    try {
        const doc = await db.collection(PRODUCT_COLLECTION).doc(req.params.id).get();
        
        if (!doc.exists) {
            return next(new NotFoundError('Produk tidak ditemukan.'));
        }

        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        next(error);
    }
};

// 4. UPDATE: PUT /api/v1/admin/products/:id
/**
 * Memperbarui data produk.
 */
exports.updateProduct = async (req, res, next) => {
    const productId = req.params.id;
    
    let updateData = {
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Konversi nilai menjadi angka jika ada
    ['minOrderQuantity', 'price', 'currentStock', 'minStockLevel'].forEach(field => {
        if (updateData[field] !== undefined) {
            updateData[field] = Number(updateData[field]);
        }
    });
    
    // Hapus ID dan SKU dari body (karena biasanya tidak diizinkan diubah)
    delete updateData.id;
    delete updateData.sku;

    try {
        const docRef = db.collection(PRODUCT_COLLECTION).doc(productId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return next(new NotFoundError('Produk tidak ditemukan.'));
        }

        await docRef.update(updateData);
        res.status(200).json({ success: true, message: 'Produk berhasil diperbarui.' });
    } catch (error) {
        next(error); 
    }
};

// 5. DELETE: DELETE /api/v1/admin/products/:id
/**
 * Menghapus produk secara permanen (Hard Delete).
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        const docRef = db.collection(PRODUCT_COLLECTION).doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            // Beri respons sukses jika produk sudah tidak ada
            return res.status(200).json({ success: true, message: 'Produk tidak ditemukan (sudah terhapus).' });
        }
        
        await docRef.delete();

        res.status(200).json({ success: true, message: 'Produk berhasil dihapus secara permanen.' });
    } catch (error) {
        next(error);
    }
};