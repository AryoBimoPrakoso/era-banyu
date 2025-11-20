// src/controllers/orderController.js

const { customError } = require('../utils/customError'); 
const { db, admin } = require('../config/db');  // db kini adalah instance Firestore
// FIX KRITIS: Pastikan logTransaction diekspor dari transactionController.js
const { logTransaction } = require('./transactionController'); 

// Definisikan referensi koleksi
const ordersCollection = db.collection('orders');
const productsCollection = db.collection('products');
const usersCollection = db.collection('users');

// ==========================================================
// RUTE PELANGGAN
// ==========================================================

// POST /api/orders/
// Membutuhkan token login. Membuat pesanan baru dan mengurangi stok dalam TRANSAKSI.
const createOrder = async (req, res, next) => {
    // Catatan: req.user.id ini didapat dari middleware auth (verifyToken)
    const userId = req.user ? req.user.id : 'tsE9HxossF4Xh9gDHJL7'; // Fallback jika pengujian tanpa auth
    
    // Menggunakan camelCase (shippingAddress, paymentMethod)
    const { items, shippingAddress, paymentMethod } = req.body; 

    // Validasi input
    if (!items || items.length === 0 || !shippingAddress || !paymentMethod) {
        return next(customError('Data pesanan tidak lengkap: produk, alamat pengiriman, dan metode pembayaran wajib diisi.', 400));
    }

    try {
        let totalAmount = 0;
        let orderItems = []; // Array untuk menyimpan detail item pesanan
        
        // Antrian untuk operasi UPDATE stok yang akan dilakukan di Fase Tulis
        const updatesQueue = []; 
        
        // FIREBASE: Gunakan db.runTransaction untuk menjamin atomisitas
        const newOrder = await db.runTransaction(async (transaction) => {
            
            // ==================================================
            // FASE 1: BACA & VALIDASI (Hanya transaction.get)
            // ==================================================
            
            for (const item of items) {
                // Menggunakan camelCase untuk product_id (productId)
                const productId = String(item.productId); 
                const productRef = productsCollection.doc(productId);
                
                // Ambil dokumen produk dalam transaksi (Baca)
                const productDoc = await transaction.get(productRef);
                
                if (!productDoc.exists) {
                    throw new Error(`[NOT_FOUND] Produk ID ${productId} tidak ditemukan.`);
                }

                const product = productDoc.data();
                
                const unitPrice = parseFloat(product.price); 
                const currentStock = parseInt(product.stock); 
                const quantity = parseInt(item.quantity); 
                
                // Validasi kuantitas item
                if (isNaN(quantity) || quantity <= 0) {
                    throw new Error(`[BAD_REQUEST] Kuantitas produk untuk ID ${productId} tidak valid.`);
                }
                
                if (currentStock < quantity) {
                    throw new Error(`[BAD_REQUEST] Stok untuk produk ${product.name} tidak mencukupi untuk ${quantity} unit. Stok saat ini: ${currentStock}.`);
                }

                // Hitung total dan persiapkan data item pesanan
                totalAmount += unitPrice * quantity;
                orderItems.push({ 
                    productId: productId,
                    name: product.name, 
                    quantity: quantity,
                    unitPrice: unitPrice,
                    subtotal: unitPrice * quantity,
                    imageUrl: product.image_url || null
                });

                // Simpan data untuk Tulis dan Logging
                updatesQueue.push({
                    ref: productRef,
                    oldStock: currentStock, 
                    quantity: quantity,     
                    newStock: currentStock - quantity,
                    productName: product.name
                });
            } // Akhir loop BACA & VALIDASI

            // ==================================================
            // FASE 2: TULIS (Hanya transaction.update & transaction.set)
            // ==================================================

            const orderRef = ordersCollection.doc();
            const orderId = orderRef.id;

            // 1. Kurangi Stok Produk untuk semua item
            for (const update of updatesQueue) {
                transaction.update(update.ref, { 
                    stock: update.newStock, 
                    updated_at: new Date()
                });
            }
            
            // 2. Buat Objek Data Pesanan
            const orderData = {
                user_id: userId,
                total_amount: totalAmount, 
                shipping_address: shippingAddress, 
                payment_method: paymentMethod, 
                status: 'Pending',
                order_date: new Date(),
                items: orderItems,
            };
            
            // 3. Masukkan Dokumen Pesanan (Insert)
            transaction.set(orderRef, orderData);
            
            // Kembalikan data pesanan baru beserta data untuk logging
            return { id: orderId, ...orderData, itemsToLog: updatesQueue };

        }); // Transaksi berakhir di sini

        // ==================================================
        // FASE 3: AFTER-TRANSACTION (Logging Inventory OUT)
        // ==================================================

        // Catat setiap pengurangan stok sebagai transaksi OUT menggunakan data yang sudah disiapkan (itemsToLog)
        for (const itemToLog of newOrder.itemsToLog) {
             // Baris ini akan berjalan normal karena logTransaction sudah diekspor
            await logTransaction({ 
                productId: itemToLog.ref.id, 
                productName: itemToLog.productName,
                quantity: itemToLog.quantity, 
                type: 'OUT',
                reason: `Penjualan (Order ID: ${newOrder.id})`,
                userId: userId, 
                oldStock: itemToLog.oldStock, 
                newStock: itemToLog.newStock 
            }, next);
        }


        res.status(201).json({ 
            message: 'Pesanan berhasil dibuat. Stok produk dikurangi.',
            order_id: newOrder.id,
            total_amount: newOrder.total_amount.toFixed(2), 
            status: newOrder.status,
            order_date: newOrder.order_date
        });

    } catch (err) {
        console.error('Transaksi pesanan gagal:', err.message || err);
        
        const message = String(err.message || ''); 

        // Deteksi status error dengan prefix unik
        // Cek 404
        if (message.includes('[NOT_FOUND]')) {
            const cleanMessage = message.replace(/\[NOT_FOUND\]/g, '').trim();
            return next(customError(cleanMessage, 404));
        }
        
        // Cek 400
        if (message.includes('[BAD_REQUEST]')) {
            const cleanMessage = message.replace(/\[BAD_REQUEST\]/g, '').trim();
            return next(customError(cleanMessage, 400));
        }

        // Default 500
        next(customError('Gagal membuat pesanan akibat masalah server internal atau kegagalan transaksi.', 500));
        
    }
};

// GET /api/orders/my
// Mengambil semua pesanan yang dimiliki user yang sedang login
const getOrdersByUser = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const snapshot = await ordersCollection
            .where('user_id', '==', userId)
            .get(); 
            
        let orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                orderDate: data.order_date,
                totalAmount: data.total_amount,
                status: data.status,
                paymentMethod: data.payment_method,
                shippingAddress: data.shipping_address
            };
        });

        // Pengurutan dilakukan secara lokal (di memori) untuk menghindari error index
        orders.sort((a, b) => {
            const dateA = a.orderDate instanceof Date ? a.orderDate.getTime() : (a.orderDate && a.orderDate.toDate ? a.orderDate.toDate().getTime() : 0);
            const dateB = b.orderDate instanceof Date ? b.orderDate.getTime() : (b.orderDate && b.orderDate.toDate ? b.orderDate.toDate().getTime() : 0);
            return dateB - dateA; // Mengurutkan dari terbaru ke terlama (descending)
        });

        res.status(200).json(orders);
    } catch (err) {
        console.error('Error saat mengambil pesanan user dari Firestore:', err); 
        next(customError('Gagal mengambil data pesanan.', 500));
    }
};

// GET /api/orders/:id
// Mengambil detail pesanan
const getOrderById = async (req, res, next) => {
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        const orderDoc = await ordersCollection.doc(orderId).get();

        if (!orderDoc.exists) {
            return next(customError('Pesanan tidak ditemukan.', 404));
        }
        
        const order = { id: orderDoc.id, ...orderDoc.data() };

        if (req.user.role !== 'admin' && order.user_id !== userId) {
            return next(customError('Akses ditolak. Anda tidak memiliki izin untuk melihat pesanan ini.', 403));
        }

        const output = {
            id: order.id,
            orderDate: order.order_date,
            totalAmount: order.total_amount,
            status: order.status,
            paymentMethod: order.payment_method,
            shippingAddress: order.shipping_address,
            items: order.items 
        };
        
        res.status(200).json(output);

    } catch (err) {
        console.error('Error saat mengambil detail pesanan dari Firestore:', err);
        next(customError('Gagal mengambil detail pesanan.', 500));
    }
};


// ==========================================================
// RUTE ADMIN
// ==========================================================

// GET /api/orders/
// Mengambil semua pesanan di sistem (Hanya Admin)
const getAllOrders = async (req, res, next) => {
    try {
        // 1. Ambil semua user untuk denormalisasi email
        const usersSnapshot = await usersCollection.get();
        const usersMap = {};
        usersSnapshot.docs.forEach(doc => {
            usersMap[doc.id] = doc.data().email || 'User Tidak Dikenal'; 
        });

        // 2. Ambil semua order
        const ordersSnapshot = await ordersCollection.get();
            
        let orders = ordersSnapshot.docs.map(doc => {
            const data = doc.data();
            const userId = data.user_id;
            return {
                id: doc.id,
                orderDate: data.order_date,
                totalAmount: data.total_amount,
                status: data.status,
                userEmail: usersMap[userId] || `ID User: ${userId}`, 
                userId: userId,
            };
        });
        
        // Pengurutan lokal (descending)
        orders.sort((a, b) => {
            const dateA = a.orderDate instanceof Date ? a.orderDate.getTime() : (a.orderDate && a.orderDate.toDate ? a.orderDate.toDate().getTime() : 0);
            const dateB = b.orderDate instanceof Date ? b.orderDate.getTime() : (b.orderDate && b.orderDate.toDate ? b.orderDate.toDate().getTime() : 0);
            return dateB - dateA;
        });


        res.status(200).json(orders);
    } catch (err) {
        console.error('Error saat mengambil semua pesanan dari Firestore:', err);
        next(customError('Gagal mengambil semua data pesanan.', 500));
    }
};

// PUT /api/orders/:id/status
// Memperbarui status pesanan (Hanya Admin)
const updateOrderStatus = async (req, res, next) => {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
        return next(customError('Status baru wajib diisi.', 400));
    }

    const validStatuses = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        return next(customError(`Status tidak valid. Gunakan salah satu dari: ${validStatuses.join(', ')}`, 400));
    }

    try {
        const orderRef = ordersCollection.doc(orderId);
        
        // 1. Cek keberadaan dokumen
        const docSnapshot = await orderRef.get();
        if (!docSnapshot.exists) {
            return next(customError('Pesanan tidak ditemukan.', 404));
        }

        // 2. Update status
        await orderRef.update({ 
            status: status,
            updated_at: new Date()
        });

        // Ambil data terbaru
        const updatedDoc = await orderRef.get();
        const updatedOrder = { id: updatedDoc.id, ...updatedDoc.data() };

        res.status(200).json({ 
            message: `Status pesanan ID ${orderId} berhasil diperbarui menjadi ${status}.`,
            order: { 
                id: updatedOrder.id, 
                status: updatedOrder.status, 
                user_id: updatedOrder.user_id 
            }
        });

    } catch (err) {
        console.error(`Error saat memperbarui status pesanan ID ${orderId} di Firestore:`, err);
        next(customError('Gagal memperbarui status pesanan.', 500));
    }
};


module.exports = {
    createOrder,
    getOrdersByUser,
    getOrderById,
    getAllOrders,
    updateOrderStatus
};