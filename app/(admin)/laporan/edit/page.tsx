"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApi, postApi, putApi } from '@/lib/apiClient'; // Gunakan helper yang sudah ada

interface OrderForm {
  nama: string;
  kontak: string;
  detail: string;
  jumlah: string;
  total: string | number; 
  tanggalPesan: string;
  tanggalPembayaran: string;
  status: string;
}

const EditLaporanContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [form, setForm] = useState<OrderForm>({
    nama: '',
    kontak: '',
    detail: '',
    jumlah: '',
    total: '',
    tanggalPesan: '',
    tanggalPembayaran: '',
    status: 'Diproses'
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch Data jika Mode Edit
  useEffect(() => {
    if (id) {
      const fetchOrder = async () => {
        setFetching(true);
        try {
          // GET /api/v1/admin/orders/:id
          const data = await getApi(`admin/orders/${id}`, true);
          
          setForm({
            nama: data.nama || '',
            kontak: data.kontak || '',
            detail: data.detail || '',
            jumlah: data.jumlah || '',
            total: data.total || '', // Load sebagai number/string
            tanggalPesan: data.tanggalPesan || '',
            tanggalPembayaran: data.tanggalPembayaran || '',
            status: data.status || 'Diproses'
          });
        } catch (err: any) {
          setError('Gagal memuat data order: ' + err.message);
        } finally {
          setFetching(false);
        }
      };
      fetchOrder();
    }
  }, [id]);

  // 2. Handle Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 3. Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        total: Number(form.total) || 0 // Pastikan kirim Number ke backend
      };

      if (id) {
        // Mode Edit: PUT
        await putApi(`admin/orders/${id}`, payload, true);
        alert("Data berhasil diperbarui!");
      } else {
        // Mode Buat: POST
        await postApi(`admin/orders`, payload, true);
        alert("Data berhasil ditambahkan!");
      }

      router.push('/laporan');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-10 text-center">Memuat data...</div>;

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6">{id ? 'Edit' : 'Tambah'} Laporan Pesanan</h1>

        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nama Pelanggan</label>
              <input
                type="text"
                name="nama"
                value={form.nama}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-black outline-none"
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Kontak / HP</label>
              <input
                type="text"
                name="kontak"
                value={form.kontak}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-black outline-none"
                placeholder="0812..."
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Detail Produk</label>
              <input
                type="text"
                name="detail"
                value={form.detail}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-black outline-none"
                placeholder="Contoh: Karton Box Ukuran 20x20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Jumlah Pesanan</label>
              <input
                type="text"
                name="jumlah"
                value={form.jumlah}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-black outline-none"
                placeholder="Contoh: 1000 pcs"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Total Harga (Rp)</label>
              <input
                type="number"
                name="total"
                value={form.total}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-black outline-none"
                placeholder="4000000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tanggal Pesanan</label>
              <input
                type="date"
                name="tanggalPesan"
                value={form.tanggalPesan}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tanggal Pembayaran</label>
              <input
                type="date"
                name="tanggalPembayaran"
                value={form.tanggalPembayaran}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg outline-none"
              >
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/laporan')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bungkus Suspense agar aman build
export default function EditLaporanPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditLaporanContent />
    </Suspense>
  );
}