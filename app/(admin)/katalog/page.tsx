"use client";
import { deleteApi, getApi } from "@/lib/apiClient";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa"; 

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  description?: string;
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
    if (!confirm("Yakin untuk hapus?")) return;

    try {
      // Panggil API DELETE /admin/product/:id
      await deleteApi(`admin/products/${id}`, true);

      // refresh data tanpa reload halaman
      await fetchProducts();
      alert("Product berhasil dihapus!");
    } catch (err: any) {
      alert(err.message || "Gagal menghapus produk");
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
            <FaPlus /> Tambah Produk
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
                  <th className="px-6 py-4">Gambar</th>
                  <th className="px-6 py-4">Nama Produk</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Harga</th>
                  <th className="px-6 py-4">Stok</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    {/* Gambar */}
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
                          <div className="flex items-center justify-center h-full text-xs text-gray-500">
                            No Img
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Nama */}
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name}
                    </td>

                    {/* Kategori */}
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-medium">
                        {item.category || "Umum"}
                      </span>
                    </td>

                    {/* Harga */}
                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      {formatRupiah(item.price)}
                    </td>

                    {/* Stok */}
                    <td className="px-6 py-4">
                      {item.stock > 0 ? (
                        <span className="text-green-600 font-medium">
                          {item.stock} unit
                        </span>
                      ) : (
                        <span className="text-red-500 font-medium">Habis</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        {/* Tombol Edit: Kirim ID lewat Query Params */}
                        <Link href={`/katalog/edit?id=${item.id}`}>
                          <button className="text-blue-600 hover:text-blue-800 p-1">
                            <FaEdit size={16} />
                          </button>
                        </Link>

                        {/* Tombol Hapus */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
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
