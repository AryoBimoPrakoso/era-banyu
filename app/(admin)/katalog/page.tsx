"use client";
import { deleteApi, getApi } from "@/lib/apiClient";
import { Plus, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  material?: string;
  size?: string;
  minOrderQuantity?: number;
  unit: number;
}

const Katalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetching
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Panggil API GET /admin/products
      const response = await getApi("admin/products", true);
      const dataProduk = response.data || response;
      setProducts(dataProduk);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data katalog");
    } finally {
      setIsLoading(false);
    }
  };

  // panggil fetch saat komponen di-mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // fungsi hapus produk
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Yakin untuk hapus?",
      text: "Produk yang dihapus tidak bisa dikembalikan",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteApi(`admin/products/${id}`, true);

      await fetchProducts();

      Swal.fire({
        title: "Berhasil!",
        text: "Berhasil menghapus produk",
        icon: "success",
      });
    } catch (err: any) {
      Swal.fire({
        title: "Gagal",
        text: err?.message || "Gagal menghapus produk",
        icon: "error",
      });
    }
  };

  // Format rupiah
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* HEADER PAGE */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Katalog Produk</h1>

        {/* Tombol Tambah Produk -> Mengarah ke halaman Edit/Create */}
        <Link href="/katalog/create">
          <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition">
            <Plus /> Tambah Produk
          </button>
        </Link>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md border border-red-300">
          {error}
        </div>
      )}

      {/* CONTENT: LOADING / TABLE */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Memuat data...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-gray-500">Belum ada produk yang tersedia.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-700 border-b">
                <tr>
                  {/* SESUAI REQUEST ANDA */}
                  <th className="px-6 py-4">Gambar</th>
                  <th className="px-6 py-4">Nama Produk</th>
                  <th className="px-6 py-4">Harga / Pcs</th>
                  <th className="px-6 py-4">Bahan</th>
                  <th className="px-6 py-4">Ukuran</th>
                  <th className="px-6 py-4">Min. Pesanan</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    {/* 1. IMAGE */}
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden relative">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs">
                            No Img
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 2. NAMA BARANG */}
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name}
                    </td>

                    {/* 3. HARGA / PCS */}
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {formatRupiah(item.price)}
                    </td>

                    {/* 4. BAHAN (MATERIAL) */}
                    <td className="px-6 py-4">{item.material || "-"}</td>

                    {/* 5. UKURAN (SIZE) */}
                    <td className="px-6 py-4">{item.size || "-"}</td>

                    {/* 6. MINIMUM PESANAN */}
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gray-100 text-gray-600 py-1 px-3 rounded-full text-xs font-medium border border-gray-200">
                        {item.minOrderQuantity || 1} {item.unit || "pcs"}
                      </span>
                    </td>

                    {/* AKSI */}
                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                      <Link href={`/katalog/edit/${item.id}`}>
                        {/* Perbaikan Link Edit */}
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit size={16} />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Katalog;
