// src/controllers/inventoryController.js
// FIXED: Firestore transaction error (Reads before Writes) in createInventoryTransaction.

const { db, admin } = require('../config/db');
const ExcelJS = require('exceljs');
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/customError'); 

// Koleksi yang digunakan
const INVENTORY_COLLECTION = 'inventoryTransactions';
const ORDER_COLLECTION = 'orders';
const PRODUCT_COLLECTION = 'products'; // Koleksi produk untuk manajemen stok langsung

// ===================================
// FUNGSI HELPER
// ===================================
/**
 * Mengonversi Firestore Timestamp menjadi string tanggal lokal (YYYY-MM-DD).
 * @param {admin.firestore.Timestamp | null} timestamp
 * @returns {string | null}
 */
const formatDateOnly = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return null;
    try {
        return timestamp.toDate().toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

// ===================================
// ADMIN API: STOK AKTUAL PRODUK (LIVE STOCK)
// ===================================

/**
 * Mengambil Laporan Stok Aktif (Live Stock) dari koleksi produk, diurutkan berdasarkan nama.
 * Endpoint: GET /api/v1/admin/inventory/live
 */
exports.getLiveStockReport = async (req, res, next) => {
    try {
        const snapshot = await db.collection(PRODUCT_COLLECTION)
            .orderBy('name', 'asc')
            .get();

        const liveStockData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                unit: data.unit,
                // Menggunakan 'currentStock' sebagai prioritas, fallback ke 'stock'
                currentStock: data.currentStock || data.stock || 0, 
                price: data.price,
                isActive: data.isActive
            };
        });

        res.status(200).json(liveStockData);
    } catch (error) {
        console.error('Error fetching live stock report:', error);
        next(new InternalServerError('Gagal mengambil laporan stok langsung.'));
    }
};

/**
 * Memperbarui Stok Produk secara langsung (Penyesuaian Stok Cepat).
 * Endpoint: PATCH /api/v1/admin/inventory/stock/:productId
 */
exports.updateProductStock = async (req, res, next) => {
    const { productId } = req.params;
    // Gunakan 'adjustment' untuk jumlah perubahan (bisa positif/negatif)
    const { adjustment, reason } = req.body; 
    const adminId = req.admin ? req.admin.id : 'unknown_admin';

    // Validasi input
    if (typeof adjustment !== 'number' || isNaN(adjustment) || adjustment === 0) {
        return next(new BadRequestError('Penyesuaian stok harus berupa angka yang valid dan bukan nol.'));
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return next(new BadRequestError('Alasan penyesuaian stok wajib diisi minimal 5 karakter.'));
    }

    const productRef = db.collection(PRODUCT_COLLECTION).doc(productId);
    let newStock = 0; 
    let productName = '';
    
    // Mulai Firestore Transaction
    try {
        await db.runTransaction(async (transaction) => {
            // 1. Ambil data produk saat ini (READ)
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
                throw new NotFoundError(`Produk dengan ID ${productId} tidak ditemukan.`);
            }

            const productData = productDoc.data();
            // Menggunakan 'currentStock' sebagai sumber utama
            const currentStock = productData.currentStock || productData.stock || 0; 
            newStock = currentStock + adjustment;
            productName = productData.name;
            
            if (newStock < 0) {
                throw new BadRequestError(`Penyesuaian stok tidak bisa menyebabkan stok minus (${newStock}).`);
            }
            
            // 2. Update field 'currentStock' di dokumen Produk (WRITE 1)
            transaction.update(productRef, {
                currentStock: newStock,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 3. Catat Transaksi Inventaris (Adjustment) (WRITE 2)
            const transactionType = adjustment > 0 ? 'Masuk-Adjustment' : 'Keluar-Adjustment';

            const transactionRecord = {
                type: transactionType, 
                date: admin.firestore.FieldValue.serverTimestamp(),
                description: `Penyesuaian Stok Cepat: ${reason}`,
                adminId: adminId, 
                details: [{
                    itemName: productData.name,
                    quantity: Math.abs(adjustment),
                    unit: productData.unit || 'unit',
                    unitPrice: productData.price || 0, 
                    productId: productId 
                }],
                sourceOrderId: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            const historyRef = db.collection(INVENTORY_COLLECTION).doc();
            transaction.set(historyRef, transactionRecord); 
        });

        // Response hanya dikirim jika transaksi berhasil
        res.status(200).json({
            success: true,
            message: `Stok produk ${productName} berhasil diperbarui. Penyesuaian: ${adjustment}. Stok baru: ${newStock}.`,
            data: { productId, newStock }
        });

    } catch (error) {
        if (error instanceof NotFoundError || error instanceof BadRequestError) {
            return next(error); 
        }
        console.error('Error running stock adjustment transaction:', error);
        next(new InternalServerError('Gagal melakukan penyesuaian stok produk.')); 
    }
};


// ===================================
// ADMIN API: Pencatatan Barang Masuk/Keluar Manual (IN/OUT)
// ===================================

/**
 * Mencatat transaksi inventaris manual (Masuk/Keluar) dan memperbarui stok produk terkait.
 * Endpoint: POST /api/v1/admin/inventory/:type (e.g., /Masuk atau /Keluar)
 * @param {object} req - Objek permintaan Express
 * @param {object} res - Objek respons Express
 * @param {function} next - Fungsi middleware berikutnya
 */
exports.createInventoryTransaction = async (req, res, next) => {
    const transactionType = req.params.type; 
    const { date, description, details } = req.body; 
    const adminId = req.admin ? req.admin.id : 'unknown_admin';
    
    if (!['Masuk', 'Keluar'].includes(transactionType)) {
        return next(new BadRequestError('Tipe transaksi harus "Masuk" (Pembelian/Masuk Stok) atau "Keluar" (Kerusakan/Sampel).'));
    }
    if (!date || !details || details.length === 0) {
        return next(new BadRequestError('Tanggal dan detail transaksi wajib diisi.'));
    }

    try {
        const processedDetails = details.map(item => ({
            itemName: item.itemName,
            quantity: Number(item.quantity) || 0,
            unit: item.unit || 'unit',
            unitPrice: Number(item.unitPrice) || 0, 
            productId: item.productId || null 
        })).filter(item => item.quantity > 0 && item.productId);

        if (processedDetails.length === 0) {
             return next(new BadRequestError('Detail transaksi tidak valid atau kuantitas nol/ID Produk hilang.'));
        }

        let transactionId; 
        
        await db.runTransaction(async (transaction) => {
            const productUpdates = [];
            const productRefs = {};

            // --- PERBAIKAN: STEP 1: READ SEMUA DOKUMEN PRODUK UPFRONT ---
            
            // 1a. Kumpulkan referensi produk unik
            for (const item of processedDetails) {
                if (!productRefs[item.productId]) {
                    productRefs[item.productId] = db.collection(PRODUCT_COLLECTION).doc(item.productId);
                }
            }
            
            // 1b. Lakukan semua pembacaan
            const productDocs = await Promise.all(
                Object.values(productRefs).map(ref => transaction.get(ref))
            );
            
            // 1c. Petakan hasil baca ke detail transaksi dan hitung stok baru
            for (let i = 0; i < processedDetails.length; i++) {
                const item = processedDetails[i];
                const productDoc = productDocs.find(doc => doc.id === item.productId);
                
                if (!productDoc || !productDoc.exists) {
                    console.warn(`Produk ID ${item.productId} tidak ditemukan. Melewati item.`);
                    continue; 
                }

                const productData = productDoc.data();
                // Menggunakan 'currentStock' sebagai sumber utama
                const currentStock = productData.currentStock || productData.stock || 0;
                const adjustment = transactionType === 'Masuk' ? item.quantity : -item.quantity;
                let newStock = currentStock + adjustment;
                
                if (newStock < 0 && transactionType === 'Keluar') {
                    // Mencegah stok minus jika Keluar Manual
                    throw new BadRequestError(`Stok produk ${item.itemName} tidak mencukupi untuk dikeluarkan. Stok saat ini: ${currentStock}.`);
                }
                
                newStock = Math.max(0, newStock); 

                productUpdates.push({
                    ref: productRefs[item.productId],
                    newStock: newStock
                });
            }

            // --- STEP 2: LAKUKAN SEMUA PENULISAN (WRITE) ---

            // 2a. Catat Transaksi Inventaris Manual (WRITE 1)
            const newTransaction = {
                type: transactionType === 'Masuk' ? 'Masuk-Manual' : 'Keluar-Manual',
                date: admin.firestore.Timestamp.fromDate(new Date(date)), 
                description: description || '',
                adminId: adminId, 
                details: processedDetails, 
                sourceOrderId: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const docRef = db.collection(INVENTORY_COLLECTION).doc();
            transaction.set(docRef, newTransaction); 
            transactionId = docRef.id; 

            // 2b. Update Stok Produk yang Terkait (WRITE 2, 3, ...)
            // Gunakan productUpdates yang sudah dihitung
            for (const update of productUpdates) {
                transaction.update(update.ref, {
                    currentStock: update.newStock,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        
        res.status(201).json({ 
            success: true,
            message: `Pencatatan barang ${transactionType} berhasil dan stok produk terkait diperbarui.`, 
            transactionId: transactionId 
        });

    } catch (error) {
        if (error instanceof BadRequestError) {
             return next(error);
        }
        console.error('Error running manual inventory transaction:', error);
        // Error internal lainnya akan tertangkap di sini
        next(new InternalServerError('Gagal mencatat transaksi inventaris manual.')); 
    }
};

// ===================================
// REDUNDANT/SINGLE-ITEM API (Jika masih diperlukan, arahkan ke createInventoryTransaction)
// ===================================

exports.recordStockIn = async (req, res, next) => {
    // Memformat body ke format multi-item agar dapat diproses oleh createInventoryTransaction
    const { productId, quantity, date, description, details } = req.body; 
    
    // Asumsi details body sudah array of objects, jika tidak, kita buat
    const finalDetails = Array.isArray(details) ? details : [{
        productId: productId, 
        quantity: quantity, 
        itemName: "Item", // Placeholder, akan ditimpa jika ada
        unitPrice: 0 // Placeholder
    }];
    
    req.params.type = 'Masuk';
    req.body = { date, description, details: finalDetails };

    // Panggil fungsi utama dengan format body yang sesuai
    return exports.createInventoryTransaction(req, res, next);
};

exports.recordStockOut = async (req, res, next) => {
    // Memformat body ke format multi-item agar dapat diproses oleh createInventoryTransaction
    const { productId, quantity, date, description, details } = req.body; 
    
    const finalDetails = Array.isArray(details) ? details : [{
        productId: productId, 
        quantity: quantity, 
        itemName: "Item", 
        unitPrice: 0 
    }];

    req.params.type = 'Keluar';
    req.body = { date, description, details: finalDetails };

    // Panggil fungsi utama dengan format body yang sesuai
    return exports.createInventoryTransaction(req, res, next);
};


// ===================================
// ADMIN API: Dashboard Data
// ===================================
// (Kode tidak diubah)
exports.getDashboardData = async (req, res, next) => {
    try {
        // 1. Pesanan Masuk (Pending)
        const pendingOrdersSnapshot = await db.collection(ORDER_COLLECTION)
            .where('status', '==', 'Pending')
            .get();
        const totalPending = pendingOrdersSnapshot.size;

        // 2. Status Pesanan (Count per status)
        const ordersSnapshot = await db.collection(ORDER_COLLECTION).get();
        const statusCounts = { Pending: 0, Diproses: 0, Selesai: 0, 'Batal/Cancelled': 0 };
        ordersSnapshot.docs.forEach(doc => {
            const status = doc.data().status;
            if (status in statusCounts) {
                statusCounts[status]++;
            }
        });

        // 3. Total Penjualan (Agregasi dari Order: Total Amount dari status Selesai)
        const completedSalesSnapshot = await db.collection(ORDER_COLLECTION)
            .where('status', '==', 'Selesai')
            .get();
            
        let totalSales = 0;
        completedSalesSnapshot.docs.forEach(doc => {
            totalSales += Number(doc.data().totalAmount || 0);
        });
        
        res.status(200).json({
            totalSales: totalSales, 
            totalPendingOrders: totalPending, 
            orderStatusCounts: statusCounts,
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        next(new InternalServerError('Gagal mengambil data dashboard.')); 
    }
};

// ===================================
// ADMIN API: Laporan Barang Keluar & Masuk (Riwayat Transaksi)
// ===================================
// (Kode tidak diubah)
exports.getInventoryReport = async (req, res, next) => {
    const { startDate, endDate, type } = req.query; 
    let allowedTypes = ['Masuk-Manual', 'Keluar-Manual', 'Keluar-Penjualan', 'Masuk-Pembatalan', 'Masuk-Adjustment', 'Keluar-Adjustment'];
    
    let query = db.collection(INVENTORY_COLLECTION).orderBy('date', 'desc');

    try {
        if (type) {
            if (!allowedTypes.includes(type)) {
                return next(new BadRequestError('Filter tipe transaksi inventaris tidak valid.'));
            }
            query = query.where('type', '==', type);
        }
        
        if (startDate && endDate) {
            const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999); 
            const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);
            
            query = query.where('date', '>=', startTimestamp).where('date', '<=', endTimestamp);
        }

        const snapshot = await query.get();
        const reportData = snapshot.docs.map(doc => {
            const data = doc.data();
            const { createdAt, updatedAt, ...restData } = data;

            return {
                id: doc.id,
                ...restData,
                date: formatDateOnly(data.date) 
            };
        });

        res.status(200).json(reportData);
    } catch (error) {
        console.error('Error fetching inventory report:', error);
        next(new InternalServerError('Gagal mengambil laporan transaksi inventaris.')); 
    }
};

// ===================================
// ADMIN API: Export ke Excel
// ===================================
// (Kode tidak diubah)
exports.exportReportToExcel = async (req, res, next) => {
    const { startDate, endDate, type } = req.query;
    let allowedTypes = ['Masuk-Manual', 'Keluar-Manual', 'Keluar-Penjualan', 'Masuk-Pembatalan', 'Masuk-Adjustment', 'Keluar-Adjustment'];
    let query = db.collection(INVENTORY_COLLECTION).orderBy('date', 'desc');

    try {
        if (type) {
            if (!allowedTypes.includes(type)) {
                return next(new BadRequestError('Filter tipe tidak valid untuk export.'));
            }
            query = query.where('type', '==', type);
        }
        
        if (startDate && endDate) {
            const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);
            query = query.where('date', '>=', startTimestamp).where('date', '<=', endTimestamp);
        }
        
        const snapshot = await query.get();
        const reportData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: formatDateOnly(doc.data().date) 
        }));
        
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Laporan Inventaris');

        // Headers
        sheet.columns = [
            { header: 'ID Transaksi', key: 'id', width: 30 },
            { header: 'Tanggal', key: 'date', width: 15 },
            { header: 'Tipe Transaksi', key: 'type', width: 25 },
            { header: 'Admin ID', key: 'adminId', width: 20 },
            { header: 'Deskripsi', key: 'description', width: 40 },
            { header: 'ID Pesanan Sumber', key: 'sourceOrderId', width: 25 },
            { header: 'Barang', key: 'itemName', width: 25 },
            { header: 'Jumlah', key: 'quantity', width: 10, style: { numFmt: '#,##0' } }, 
            { header: 'Satuan', key: 'unit', width: 10 },
            { header: 'Harga Satuan', key: 'unitPrice', width: 15, style: { numFmt: '"Rp" #,##0' } }, 
            { header: 'Total', key: 'total', width: 15, style: { numFmt: '"Rp" #,##0' } }
        ];

        // Isi data (Flattening details array)
        reportData.forEach(trans => {
            const detailsArray = Array.isArray(trans.details) ? trans.details : []; 
            detailsArray.forEach(detail => {
                const quantity = Number(detail.quantity) || 0;
                const unitPrice = Number(detail.unitPrice) || 0;

                sheet.addRow({
                    id: trans.id,
                    date: trans.date,
                    type: trans.type,
                    adminId: trans.adminId || 'N/A',
                    description: trans.description,
                    sourceOrderId: trans.sourceOrderId || 'N/A',
                    itemName: detail.itemName,
                    quantity: quantity,
                    unit: detail.unit,
                    unitPrice: unitPrice,
                    total: quantity * unitPrice
                });
            });
        });

        // Response Header untuk Excel
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Laporan_Inventaris_${startDate || 'Semua'}_${endDate || 'Semua'}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting inventory report:', error);
        next(new InternalServerError('Gagal membuat dan mengirim file Excel laporan inventaris.')); 
    }
};