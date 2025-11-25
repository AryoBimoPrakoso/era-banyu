// src/controllers/orderController.js

const { db, admin } = require('../config/db');
const ExcelJS = require('exceljs');

// Import Custom Error
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/customError');

// Definisi Koleksi
const ORDER_COLLECTION = 'orders';
const INVENTORY_COLLECTION = 'inventoryTransactions';

// ===================================
// FUNGSI HELPER UNTUK FORMAT WAKTU
// ===================================

/**
 * Mengonversi Firestore Timestamp menjadi string waktu lokal (WIB) dengan format lengkap.
 * Digunakan untuk response JSON.
 * @param {admin.firestore.Timestamp | null} timestamp
 * @returns {string | null}
 */
const formatTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return null;
    try {
        const date = timestamp.toDate();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta'
        };
        return date.toLocaleString('id-ID', options);
    } catch (e) {
        console.error("Error formatting timestamp:", e);
        return null;
    }
};

/**
 * Mengonversi Firestore Timestamp menjadi string format ISO untuk Excel (`DD/MM/YYYY HH:MM:SS WIB`).
 * Digunakan khusus untuk export Excel, memastikan zona waktu Jakarta.
 * @param {admin.firestore.Timestamp | null} timestamp
 * @returns {string}
 */
const formatDateForExcel = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    
    const date = timestamp.toDate();
    return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
    }) + ' (WIB)';
};

/**
 * Helper untuk mengonversi string tanggal menjadi Firestore Timestamp.
 * Melempar BadRequestError jika format tidak valid.
 * @param {string | null | undefined} dateString
 * @param {string} fieldName
 * @returns {admin.firestore.Timestamp | null}
 */
const convertToTimestamp = (dateString, fieldName) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new BadRequestError(`Format Tanggal ${fieldName} tidak valid.`);
    }
    return admin.firestore.Timestamp.fromDate(date);
};

/**
 * Helper untuk menghitung total pesanan dari detail produk.
 * @param {Array} orderDetails - Array of { productName, quantity, unitPrice }
 * @param {number} shippingFee - Biaya kirim
 * @returns {number} totalAmount
 */
const calculateTotal = (orderDetails, shippingFee = 0) => {
    let calculatedTotalAmount = 0;

    // Hitung subtotal setiap item
    orderDetails.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        calculatedTotalAmount += quantity * unitPrice;
    });

    // Tambahkan biaya kirim
    calculatedTotalAmount += Number(shippingFee) || 0;
    return calculatedTotalAmount;
};

// ===================================
// ADMIN API: 1. CREATE Order (Input Manual oleh Admin)
// POST /api/v1/admin/orders
// ===================================
const createManualOrder = async (req, res, next) => {
    const {
        orderNumber,
        customerName,
        waContact,
        shippingFee,
        paymentMethod,
        orderDate,
        paymentDate,
        status,
        notes,
        orderDetails
    } = req.body;

    const adminId = req.user?.uid || req.admin?.uid || 'UNAUTHENTICATED_ADMIN';

    // --- Validasi Dasar ---
    if (!customerName || !waContact || !orderDate || !status || !orderDetails || orderDetails.length === 0) {
        return next(new BadRequestError('Data pesanan wajib diisi: Nama Pelanggan, Kontak WA, Tanggal Pesanan, Status, dan Detail Produk.'));
    }

    const validStatuses = ['Pending', 'Diproses', 'Selesai', 'Batal/Cancelled'];
    if (!validStatuses.includes(status)) {
        return next(new BadRequestError('Status awal pesanan tidak valid. Harus salah satu dari: ' + validStatuses.join(', ')));
    }

    try {
        // Validasi dan Konversi Tanggal menggunakan helper
        const orderTimestamp = convertToTimestamp(orderDate, 'Pemesanan');
        const paymentTimestamp = convertToTimestamp(paymentDate, 'Pembayaran');

        let orderId = null;
        let finalStatus = status;

        // 1. Hitung Ulang Total (Safety Check) dan Map Detail
        const calculatedShippingFee = Number(shippingFee) || 0;
        const calculatedTotalAmount = calculateTotal(orderDetails, calculatedShippingFee);

        const mappedOrderDetails = orderDetails.map(item => ({
            productName: item.productName,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            subtotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
            unit: item.unit || 'unit',
        }));

        await db.runTransaction(async (transaction) => {
            const docRef = db.collection(ORDER_COLLECTION).doc();
            orderId = docRef.id;

            // Tentukan nomor pesanan. Gunakan orderId jika tidak disediakan
            const finalOrderNumber = orderNumber || orderId;

            // 2. Buat Objek Pesanan Baru
            const newOrder = {
                orderNumber: finalOrderNumber,
                customerName,
                waContact,
                totalAmount: calculatedTotalAmount,
                shippingFee: calculatedShippingFee,
                paymentMethod: paymentMethod || 'Belum Ditentukan',
                orderDate: orderTimestamp,
                paymentDate: paymentTimestamp,
                status: finalStatus,
                notes: notes || '',
                orderDetails: mappedOrderDetails,
                createdByAdmin: adminId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            transaction.set(docRef, newOrder);

            // 3. Potong Stok (Buat Transaksi Inventaris Keluar) jika status adalah 'Diproses' atau 'Selesai'
            if (finalStatus === 'Diproses' || finalStatus === 'Selesai') {
                const transactionRecord = {
                    type: 'Keluar-Penjualan',
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    description: `Penjualan (Order #${orderId}) dicatat secara manual oleh admin.`,
                    adminId: adminId,
                    details: newOrder.orderDetails
                        .filter(item => item.quantity > 0)
                        .map(item => ({
                            itemName: item.productName,
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                        })),
                    sourceOrderId: orderId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                const historyRef = db.collection(INVENTORY_COLLECTION).doc();
                transaction.set(historyRef, transactionRecord);
            }
        });

        // Notifikasi socket.io
        if (req.app.locals.io) {
            req.app.locals.io.to('admin-dashboard').emit('newOrderCreated', {
                id: orderId,
                customerName: customerName,
                status: finalStatus
            });
        }

        res.status(201).json({
            success: true,
            message: `Pesanan #${orderId} berhasil dicatat secara manual dengan status: ${finalStatus}.`,
            orderId: orderId
        });

    } catch (error) {
        console.error('Error saat membuat pesanan manual:', error);
        // Pastikan error BadRequest yang berasal dari convertToTimestamp atau validasi lain diteruskan
        if (error instanceof NotFoundError || error instanceof BadRequestError) {
             return next(error);
        }
        next(new InternalServerError('Gagal mencatat pesanan secara manual.'));
    }
};

// ===================================
// ADMIN API: 2. Get All Orders (DIPERBAIKI: Menambah filtering Tanggal)
// GET /api/v1/admin/orders
// ===================================
const getAllOrders = async (req, res, next) => {
    const { export: exportFlag, status: filterStatus, startDate, endDate } = req.query;

    try {
        let query = db.collection(ORDER_COLLECTION).orderBy('orderDate', 'desc');

        // 1. Filter Berdasarkan Status
        if (filterStatus) {
            query = query.where('status', '==', filterStatus);
        }

        // 2. Filter Berdasarkan Rentang Tanggal Pemesanan
        if (startDate && endDate) {
            // Validasi format tanggal dasar (tidak perlu try/catch karena sudah ditangani di convertToTimestamp)
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return next(new BadRequestError('Format Tanggal Mulai atau Akhir tidak valid.'));
            }

            // Tanggal mulai (00:00:00)
            start.setHours(0, 0, 0, 0);
            const startTimestamp = admin.firestore.Timestamp.fromDate(start);

            // Tanggal akhir (23:59:59.999)
            end.setHours(23, 59, 59, 999); 
            const endTimestamp = admin.firestore.Timestamp.fromDate(end);

            query = query.where('orderDate', '>=', startTimestamp).where('orderDate', '<=', endTimestamp);
        }

        const snapshot = await query.get();

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();

            return {
                id: doc.id,
                orderNumber: data.orderNumber,
                customerName: data.customerName,
                waContact: data.waContact,
                status: data.status,
                totalAmount: data.totalAmount,
                shippingFee: data.shippingFee,
                paymentMethod: data.paymentMethod,
                notes: data.notes,
                orderDetails: data.orderDetails,
                createdByAdmin: data.createdByAdmin,
                updatedByAdmin: data.updatedByAdmin || null, 
                orderDate: data.orderDate,
                paymentDate: data.paymentDate,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            };
        });

        // ----------------------------------------------------
        // LOGIKA EXPORT KE EXCEL
        // ----------------------------------------------------
        if (exportFlag === 'true') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Laporan Pesanan');

            // 1. Tentukan Header Kolom
            worksheet.columns = [
                { header: 'No', key: 'no', width: 5 },
                { header: 'ID Pesanan', key: 'id', width: 25 }, // Tambahkan ID
                { header: 'Nama Pemesan', key: 'customerName', width: 30 },
                { header: 'Kontak', key: 'waContact', width: 20 },
                { header: 'Detail Produk yang di pesan', key: 'productDetails', width: 60 },
                { header: 'Jumlah pesanan', key: 'totalQuantity', width: 15 },
                { header: 'Total', key: 'totalAmount', width: 20, style: { numFmt: '"Rp" #,##0' } },
                { header: 'Tanggal Pemesanan(beserta jam WIB)', key: 'orderDate', width: 35 }, 
                { header: 'Tanggal Pembayaran(beserta jam WIB)', key: 'paymentDate', width: 35 }, 
                { header: 'Status Order', key: 'status', width: 20 },
            ];

            worksheet.getRow(1).font = { bold: true };

            // 2. Isi Data Baris
            let no = 1;
            orders.forEach(order => {
                
                let totalQuantity = 0;
                const detailsSummary = (order.orderDetails || []).map(detail => {
                    const quantity = Number(detail.quantity) || 0;
                    totalQuantity += quantity;
                    return `${detail.productName} (${quantity} ${detail.unit || 'unit'} @ Rp${(detail.unitPrice || 0).toLocaleString('id-ID')})`;
                }).join('; ');

                worksheet.addRow({
                    no: no++,
                    id: order.id, // ID Pesanan
                    customerName: order.customerName,
                    waContact: order.waContact,
                    productDetails: detailsSummary,
                    totalQuantity: totalQuantity,
                    totalAmount: order.totalAmount,
                    
                    // Menggunakan helper untuk format waktu WIB
                    orderDate: formatDateForExcel(order.orderDate),
                    paymentDate: formatDateForExcel(order.paymentDate), 
                    
                    status: order.status,
                });
            });

            // 3. Konfigurasi Respons Header
            const dateSuffix = (startDate && endDate) ? `${startDate}_to_${endDate}` : 'Semua';

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=Laporan_Pesanan_${dateSuffix}.xlsx`
            );

            // 4. Kirim File Excel ke Client
            return workbook.xlsx.write(res)
                .then(() => {
                    res.end();
                })
                .catch(err => {
                    console.error('Error saat menulis file Excel:', err);
                    next(new InternalServerError('Gagal membuat dan mengirim file Excel.'));
                });
        }

        // ----------------------------------------------------
        // LOGIKA RESPONS JSON DEFAULT 
        // ----------------------------------------------------
        const formattedOrders = orders.map(order => ({
            ...order,
            orderDate: formatTimestamp(order.orderDate),
            paymentDate: formatTimestamp(order.paymentDate),
            createdAt: formatTimestamp(order.createdAt),
            updatedAt: formatTimestamp(order.updatedAt)
        }));

        res.status(200).json(formattedOrders);

    } catch (error) {
        console.error('Error saat mengambil data pesanan:', error);
        if (error instanceof BadRequestError) { // Tangkap BadRequestError dari validasi tanggal
             return next(error);
        }
        next(new InternalServerError('Gagal mengambil data pesanan.'));
    }
};

// ===================================
// ADMIN API: 3. Get One Order
// GET /api/v1/admin/orders/:id
// ===================================
const getOrderById = async (req, res, next) => {
    const orderId = req.params.id;

    try {
        const doc = await db.collection(ORDER_COLLECTION).doc(orderId).get();

        if (!doc.exists) {
            return next(new NotFoundError(`Pesanan dengan ID ${orderId} tidak ditemukan.`));
        }

        const data = doc.data();

        const order = {
            id: doc.id,
            ...data,
            orderDate: formatTimestamp(data.orderDate),
            paymentDate: formatTimestamp(data.paymentDate),
            createdAt: formatTimestamp(data.createdAt),
            updatedAt: formatTimestamp(data.updatedAt)
        };

        res.status(200).json(order);
    } catch (error) {
        console.error('Error saat mengambil pesanan berdasarkan ID:', error);
        next(new InternalServerError('Gagal mengambil data pesanan.'));
    }
};

// ===================================
// ADMIN API: 4. Update Order (Update semua field kecuali status/stok)
// PUT/PATCH /api/v1/admin/orders/:id
// ===================================
const updateOrder = async (req, res, next) => {
    const orderId = req.params.id;
    const {
        orderNumber, customerName, waContact, shippingFee, paymentMethod,
        orderDate, paymentDate, notes, orderDetails
    } = req.body;

    if (!orderId) {
        return next(new BadRequestError('Order ID wajib disertakan dalam URL.'));
    }

    const orderRef = db.collection(ORDER_COLLECTION).doc(orderId);
    const adminId = req.admin ? req.admin.uid : 'system_update';

    // Siapkan objek update
    const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedByAdmin: adminId,
    };

    try {
        // Cek dulu apakah order ada dan ambil data lama
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            return next(new NotFoundError(`Pesanan dengan ID ${orderId} tidak ditemukan.`));
        }

        const existingData = orderDoc.data();
        let currentShippingFee = existingData.shippingFee;
        let currentOrderDetails = existingData.orderDetails || [];

        // 1. Update Detail Pesanan dan Biaya Kirim
        if (orderDetails && orderDetails.length > 0) {
            // Jika orderDetails dikirim, gunakan yang baru
            currentOrderDetails = orderDetails.map(item => ({
                productName: item.productName,
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                subtotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
                unit: item.unit || 'unit',
            }));
            updateData.orderDetails = currentOrderDetails;
        }

        // Jika shippingFee dikirim (baik bersama orderDetails atau sendirian)
        if (shippingFee !== undefined) {
            currentShippingFee = Number(shippingFee) || 0;
            updateData.shippingFee = currentShippingFee;
        }

        // 2. Hitung Ulang Total Jumlah
        const calculatedTotalAmount = calculateTotal(currentOrderDetails, currentShippingFee);
        updateData.totalAmount = calculatedTotalAmount;

        // 3. Field Lain yang diizinkan diupdate (selain status)
        if (orderNumber !== undefined) updateData.orderNumber = orderNumber || null;
        if (customerName !== undefined) updateData.customerName = customerName;
        if (waContact !== undefined) updateData.waContact = waContact;
        if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod || 'Belum Ditentukan';
        if (notes !== undefined) updateData.notes = notes || '';

        // 4. Tanggal
        if (orderDate !== undefined) {
             updateData.orderDate = convertToTimestamp(orderDate, 'Pemesanan');
        }
        if (paymentDate !== undefined) {
            // Gunakan helper yang sudah menangani string kosong/null
            updateData.paymentDate = convertToTimestamp(paymentDate, 'Pembayaran');
        }

        // Lakukan update
        await orderRef.update(updateData);

        // Notifikasi socket.io
        if (req.app.locals.io) {
            req.app.locals.io.to('admin-dashboard').emit('orderUpdated', {
                id: orderId,
                data: updateData
            });
        }


        res.status(200).json({
            success: true,
            message: `Pesanan ${orderId} berhasil diperbarui (detail non-status).`,
            orderId: orderId
        });

    } catch (error) {
        console.error('Error saat memperbarui pesanan:', error);
        // Tangkap BadRequestError dari helper convertToTimestamp
        if (error instanceof NotFoundError || error instanceof BadRequestError) {
             return next(error);
        }
        next(new InternalServerError('Gagal memperbarui data pesanan.'));
    }
};

// ===================================
// ADMIN API: 5. Update Status (Integrasi Stok Terstruktur)
// PATCH /api/v1/admin/orders/:id/status
// ===================================
const updateOrderStatus = async (req, res, next) => {
    const orderId = req.params.id;
    const { status, paymentDate } = req.body;

    const validStatuses = ['Pending', 'Diproses', 'Selesai', 'Batal/Cancelled'];

    if (!status || !validStatuses.includes(status)) {
        return next(new BadRequestError('Status yang dikirim tidak valid. Harus salah satu dari: ' + validStatuses.join(', ')));
    }

    const orderRef = db.collection(ORDER_COLLECTION).doc(orderId);
    const adminId = req.admin ? req.admin.uid : 'system_status_update';

    try {
        let oldStatus = '';
        let transactionMessage = '';

        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists) {
                // Gunakan throw untuk membatalkan transaksi dan menangkapnya di blok catch utama
                throw new NotFoundError(`Pesanan dengan ID ${orderId} tidak ditemukan.`);
            }

            oldStatus = orderDoc.data().status;
            const orderDetails = orderDoc.data().orderDetails || [];

            if (oldStatus === status) {
                // Throw BadRequestError agar ditangkap di catch dan dikirim ke klien
                throw new BadRequestError(`Status pesanan sudah ${status}. Tidak ada perubahan yang dilakukan.`);
            }

            // --- 1. Perbarui Status Pesanan & Tanggal Pembayaran (jika ada) ---
            const updateData = {
                status: status,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedByAdmin: adminId,
            };

            // Logika Tanggal Pembayaran: hanya diatur jika status Selesai
            if (status === 'Selesai' && paymentDate !== undefined) {
                // Gunakan helper yang akan throw BadRequestError jika format tidak valid
                updateData.paymentDate = convertToTimestamp(paymentDate, 'Pembayaran');
            } else if (status === 'Selesai' && orderDoc.data().paymentDate === null) {
                // Jika status diubah ke Selesai tetapi paymentDate tidak dikirim, beri peringatan
                // Anda mungkin ingin menambahkan logika untuk secara otomatis menyetel ke serverTimestamp() di sini
                // atau memaksa user mengirim tanggal. Untuk saat ini, kita biarkan null jika tidak dikirim.
            } else if (status !== 'Selesai' && paymentDate !== undefined) {
                // Jika user mengirim paymentDate tapi status bukan Selesai, abaikan/hapus dari updateData
                // Atau set ke null jika status diubah dari Selesai
                if (oldStatus === 'Selesai') {
                    updateData.paymentDate = null;
                }
            }


            transaction.update(orderRef, updateData);

            // --- 2. Logika Transaksi Inventaris (Potong/Kembalikan Stok) ---

            const isOldStatusSold = oldStatus === 'Diproses' || oldStatus === 'Selesai';
            const isNewStatusSold = status === 'Diproses' || status === 'Selesai';

            // Aksi Stok Keluar: Pindah dari Non-Proses ke Proses/Selesai
            const shouldRecordStockOut = !isOldStatusSold && isNewStatusSold;

            // Aksi Stok Masuk (Pengembalian): Pindah dari Proses/Selesai ke Batal/Pending
            const shouldRecordStockIn = isOldStatusSold && (status === 'Batal/Cancelled' || status === 'Pending');

            if (shouldRecordStockOut) {
                // Catat Barang Keluar
                const transactionRecord = {
                    type: 'Keluar-Penjualan',
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    description: `Penjualan (Order #${orderId}) dicatat sebagai barang keluar. Status lama: ${oldStatus}, Status baru: ${status}`,
                    adminId: adminId,
                    details: orderDetails
                        .filter(item => item.quantity > 0)
                        .map(item => ({
                            itemName: item.productName,
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                        })),
                    sourceOrderId: orderId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                const historyRef = db.collection(INVENTORY_COLLECTION).doc();
                transaction.set(historyRef, transactionRecord);
                transactionMessage = ' dan stok dicatat sebagai barang keluar.';

            } else if (shouldRecordStockIn) {
                // Catat Barang Masuk (Pengembalian Stok)
                const transactionRecord = {
                    type: 'Masuk-Pembatalan',
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    description: `Pengembalian Stok (Order #${orderId}) dibatalkan/di-pending. Status lama: ${oldStatus}, Status baru: ${status}`,
                    adminId: adminId,
                    details: orderDetails
                        .filter(item => item.quantity > 0)
                        .map(item => ({
                            itemName: item.productName,
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                        })),
                    sourceOrderId: orderId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                const historyRef = db.collection(INVENTORY_COLLECTION).doc();
                transaction.set(historyRef, transactionRecord);
                transactionMessage = ' dan stok dicatat sebagai barang masuk (pengembalian).';
            }
        });

        // Notifikasi socket.io
        if (req.app.locals.io) {
            req.app.locals.io.to('admin-dashboard').emit('orderStatusUpdated', {
                id: orderId,
                newStatus: status
            });
        }


        res.status(200).json({
            success: true,
            message: `Status pesanan ${orderId} berhasil diubah dari ${oldStatus} menjadi ${status}${transactionMessage}.`,
            orderId: orderId,
            newStatus: status
        });
    } catch (error) {
        // Tangkap error yang dilempar dari dalam transaction (BadRequest, NotFound)
        if (error instanceof NotFoundError || error instanceof BadRequestError) {
             return next(error);
        }

        console.error('Error saat mengubah status pesanan:', error);
        next(new InternalServerError('Gagal mengubah status pesanan.'));
    }
};

// ===================================
// ADMIN API: 6. DELETE Order
// DELETE /api/v1/admin/orders/:id
// ===================================
const deleteOrder = async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const docRef = db.collection(ORDER_COLLECTION).doc(orderId);
        const doc = await docRef.get();

        if (!doc.exists) {
            // Walaupun tidak ditemukan, kita anggap sukses karena tujuannya tercapai (terhapus)
            return res.status(200).json({ success: true, message: 'Pesanan tidak ditemukan (sudah terhapus).' });
        }

        // Cek status, TIDAK boleh hapus jika status "Diproses" atau "Selesai"
        const status = doc.data().status;
        if (status === 'Diproses' || status === 'Selesai') {
             return next(new BadRequestError(`Pesanan dengan status ${status} tidak dapat dihapus. Ubah status menjadi 'Batal/Cancelled' atau 'Pending' terlebih dahulu untuk mengelola stok.`));
        }

        // --- HARD DELETE ---
        await docRef.delete();

        res.status(200).json({ success: true, message: `Pesanan ${orderId} berhasil dihapus secara permanen.` });
    } catch (error) {
        console.error('Error saat menghapus pesanan:', error);
        next(new InternalServerError('Gagal menghapus pesanan.'));
    }
};

// ===================================
// Export Functions
// ===================================
module.exports = {
    createManualOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
};