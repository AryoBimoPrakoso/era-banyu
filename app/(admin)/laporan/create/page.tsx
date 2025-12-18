"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { postApi } from "@/lib/apiClient"; // Kita hanya butuh postApi
import { FaArrowLeft, FaSave } from "react-icons/fa";

// Interface untuk Initial State
interface OrderForm {
  nama: string;
  kontak: string;
  detail: string;
  jumlah: string;
  total: string; // String agar bisa dikosongkan saat input
  tanggalPesan: string;
  tanggalPembayaran: string;
  status: string;
}

export default function CreateLaporanPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Initial State Kosong
  const [form, setForm] = useState<OrderForm>({
    nama: "",
    kontak: "",
    detail: "",
    jumlah: "",
    total: "",
    tanggalPesan: new Date().toISOString().split("T")[0], // Default hari ini
    tanggalPembayaran: "",
    status: "Diproses",
  });

  // Handle Perubahan Input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle Submit (POST)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validasi sederhana
      if (!form.nama || !form.total) {
        throw new Error("Nama dan Total wajib diisi.");
      }

      // Persiapkan Payload (Konversi Total ke Number)
      const payload = {
        nama: form.nama,
        kontak: form.kontak,
        detail: form.detail,
        jumlah: form.jumlah,
        total: Number(form.total), // Konversi ke Number sesuai backend
        tanggalPesan: form.tanggalPesan,
        tanggalPembayaran: form.tanggalPembayaran || null,
        status: form.status,
      };

      // Panggil API POST
      await postApi("admin/orders", payload, true);

      alert("Laporan pesanan berhasil ditambahkan!");
      router.push("/laporan"); // Kembali ke list laporan

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menyimpan data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-black transition">
            <FaArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Tambah Laporan Baru</h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nama Pelanggan */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nama Pelanggan <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="nama"
                value={form.nama}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none transition"
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>

            {/* Kontak */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Kontak / HP <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="kontak"
                value={form.kontak}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none transition"
                placeholder="0812..."
                required
              />
            </div>

            {/* Detail Produk */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-gray-700">Detail Produk <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="detail"
                value={form.detail}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none transition"
                placeholder="Contoh: Karton Box 20x20x10 (Bahan Kraft)"
                required
              />
            </div>

            {/* Jumlah Pesanan */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Jumlah Pesanan <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="jumlah"
                value={form.jumlah}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none transition"
                placeholder="Contoh: 500 Pcs"
                required
              />
            </div>

            {/* Total Harga */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Total Harga (Rp) <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="total"
                value={form.total}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none transition"
                placeholder="0"
                min="0"
                required
              />
            </div>

            {/* Tanggal Pesanan */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Tanggal Pesanan <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="tanggalPesan"
                value={form.tanggalPesan}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none transition"
                required
              />
            </div>

            {/* Tanggal Pembayaran */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Tanggal Pembayaran</label>
              <input
                type="date"
                name="tanggalPembayaran"
                value={form.tanggalPembayaran}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none transition"
              />
              <p className="text-xs text-gray-400">Kosongkan jika belum lunas.</p>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Status Pesanan</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white transition"
              >
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex gap-4 pt-6 border-t border-gray-100 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <FaSave />
              {isLoading ? "Menyimpan..." : "Simpan Data"}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}