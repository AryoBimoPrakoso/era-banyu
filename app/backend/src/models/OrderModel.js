/**
 * Model Definisi Pesanan (Order)
 * * Model ini digunakan sebagai referensi untuk struktur data yang disimpan dalam 
 * koleksi 'orders' di Firestore. Meskipun Firestore bersifat schemaless, 
 * model ini membantu dalam dokumentasi, validasi, dan menjaga konsistensi.
 */

// Status pesanan yang valid:
const VALID_ORDER_STATUSES = ['Pending', 'Diproses', 'Selesai', 'Batal/Cancelled'];

// Status transaksi inventaris yang valid:
const VALID_INVENTORY_TYPES = ['Keluar-Penjualan', 'Masuk-Pembatalan'];


/**
 * @typedef {object} OrderDetail
 * @property {string} productName - Nama produk yang dipesan.
 * @property {number} quantity - Jumlah kuantitas.
 * @property {number} unitPrice - Harga jual per unit.
 * @property {number} subtotal - Hasil dari quantity * unitPrice.
 * @property {string} [unit='unit'] - Satuan produk (e.g., 'kg', 'pcs').
 */

/**
 * @typedef {object} Order
 * @property {string} [id] - ID Dokumen Firestore (dibuat secara otomatis).
 * @property {string | null} orderNumber - Nomor invoice atau nomor pesanan internal (optional).
 * @property {string} customerName - Nama lengkap pelanggan.
 * @property {string} waContact - Nomor kontak WhatsApp pelanggan.
 * @property {number} totalAmount - Total pembayaran akhir (termasuk shippingFee).
 * @property {number} shippingFee - Biaya pengiriman.
 * @property {string} paymentMethod - Metode pembayaran (e.g., 'Transfer Bank', 'COD', 'Tunai').
 * * @property {admin.firestore.Timestamp} orderDate - Tanggal pesanan dibuat/diterima (Wajib).
 * @property {admin.firestore.Timestamp | null} paymentDate - Tanggal pembayaran diterima (optional).
 * * @property {('Pending'|'Diproses'|'Selesai'|'Batal/Cancelled')} status - Status saat ini dari pesanan.
 * @property {string} [notes] - Catatan tambahan untuk pesanan.
 * * @property {OrderDetail[]} orderDetails - Array detail produk yang dipesan.
 * * @property {string} createdByAdmin - ID Admin (UID) yang membuat pesanan manual.
 * @property {admin.firestore.Timestamp} createdAt - Timestamp kapan dokumen dibuat.
 * @property {admin.firestore.Timestamp} updatedAt - Timestamp kapan dokumen terakhir diperbarui.
 * @property {string} [updatedByAdmin] - ID Admin (UID) yang terakhir mengubah pesanan.
 */


/**
 * @typedef {object} InventoryTransaction
 * @property {('Keluar-Penjualan'|'Masuk-Pembatalan')} type - Jenis transaksi (Keluar untuk penjualan/potong stok, Masuk untuk pembatalan/pengembalian stok).
 * @property {admin.firestore.Timestamp} date - Tanggal transaksi inventaris dicatat.
 * @property {string} description - Deskripsi atau alasan transaksi (e.g., "Stok keluar dari Order #XYZ").
 * @property {string} adminId - ID Admin (UID) yang memicu transaksi ini.
 * @property {OrderDetail[]} details - Detail item dan kuantitas yang terpengaruh (sama dengan OrderDetail, namun fokus pada item yang keluar/masuk).
 * @property {string} sourceOrderId - ID pesanan yang menjadi sumber transaksi inventaris.
 * @property {admin.firestore.Timestamp} createdAt - Timestamp kapan dokumen dibuat.
 */


const OrderSchema = {
    /**
     * Objek skema untuk referensi, TIDAK digunakan untuk validasi skema runtime di Node.js/Express.
     * Digunakan sebagai panduan struktur data.
     */
    ORDER_SCHEMA: {
        orderNumber: { type: 'string', required: false, nullable: true, description: 'Nomor invoice' },
        customerName: { type: 'string', required: true },
        waContact: { type: 'string', required: true },
        totalAmount: { type: 'number', required: true, calculationSource: 'Server' },
        shippingFee: { type: 'number', required: true },
        paymentMethod: { type: 'string', required: true },
        orderDate: { type: 'Timestamp', required: true },
        paymentDate: { type: 'Timestamp', required: false, nullable: true },
        status: { type: 'string', required: true, enum: VALID_ORDER_STATUSES },
        notes: { type: 'string', required: false },
        orderDetails: { 
            type: 'array', 
            required: true, 
            items: { 
                productName: 'string', 
                quantity: 'number', 
                unitPrice: 'number',
                subtotal: 'number',
                unit: 'string' 
            }
        },
        createdByAdmin: { type: 'string', required: true, description: 'UID Admin Pembuat' },
        updatedByAdmin: { type: 'string', required: false, description: 'UID Admin Terakhir Update' },
        createdAt: { type: 'Timestamp', required: true, serverValue: 'serverTimestamp' },
        updatedAt: { type: 'Timestamp', required: true, serverValue: 'serverTimestamp' },
    },
    INVENTORY_TRANSACTION_SCHEMA: {
         type: { type: 'string', required: true, enum: VALID_INVENTORY_TYPES },
         date: { type: 'Timestamp', required: true, serverValue: 'serverTimestamp' },
         description: { type: 'string', required: true },
         adminId: { type: 'string', required: true, description: 'UID Admin Pemicu' },
         details: { 
             type: 'array', 
             required: true, 
             items: { 
                 itemName: 'string', 
                 quantity: 'number', 
                 unit: 'string', 
                 unitPrice: 'number',
             }
         },
         sourceOrderId: { type: 'string', required: true },
         createdAt: { type: 'Timestamp', required: true, serverValue: 'serverTimestamp' },
    }
};

module.exports = OrderSchema;