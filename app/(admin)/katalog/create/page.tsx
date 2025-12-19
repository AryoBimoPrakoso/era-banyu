"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { postApi } from "@/lib/apiClient";
import { FaArrowLeft, FaSave, FaImage } from "react-icons/fa";
import Swal from "sweetalert2";

// Definisi State Form
interface ProductFormCreate {
  name: string;
  sku: string;
  price: string;
  stock: string;
  minOrder: string;
  unit: string;
  description: string;
  imageUrl: string;
  material: string;
  size: string;
}

const CreateKatalogPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Initial State
  const [formData, setFormData] = useState<ProductFormCreate>({
    name: "",
    sku: "",
    price: "",
    stock: "",
    minOrder: "1",
    unit: "pcs",
    description: "",
    imageUrl: "",
    material: "",
    size: "",
  });

  // Handle Perubahan Input Text/Number
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

// Handle Upload Gambar (Convert to Base64)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi ukuran (Max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          title: "Peringatan!",
          text: "Ukuran file terlalu besar (max 2mb)",
          icon: "warning",
        });
        
        e.target.value = ""; 
        return; 
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Hasil berupa "data:image/jpeg;base64,..."
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Validasi Manual (Opsional, tapi bagus untuk UX)
      if (
        !formData.name ||
        !formData.sku ||
        !formData.price ||
        !formData.unit
      ) {
        throw new Error("Mohon lengkapi field yang bertanda bintang (*).");
      }

      // 2. Persiapkan Payload sesuai request body di productController.js
      const payload = {
        name: formData.name,
        sku: formData.sku,

        // Konversi ke number karena backend mengharapkan angka
        price: Number(formData.price),
        currentStock: Number(formData.stock) || 0,
        minOrderQuantity: Number(formData.minOrder) || 1,

        unit: formData.unit,
        description: formData.description,
        imageUrl: formData.imageUrl,
        material: formData.material,
        size: formData.size,
      };

      // 3. Kirim ke Backend (POST)
      await postApi("admin/products", payload, true);

      // 4. Sukses
      Swal.fire({
        title: "Berhasil!",
        text: "Produk berhasil ditambahkan.",
        icon: "success",
      });
      router.push("/katalog");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menambahkan produk.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-black transition"
        >
          <FaArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Tambah Produk Baru</h1>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6"
      >
        {/* --- Bagian Gambar --- */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Foto Produk
          </label>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center relative">
              {formData.imageUrl ? (
                <Image
                  src={formData.imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <FaImage className="text-gray-300 text-3xl" />
              )}
            </div>
            <div className="flex flex-col gap-2 justify-center h-32">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              />
              <p className="text-xs text-gray-400">
                Format: JPG, PNG. Maksimal 2MB.
              </p>
            </div>
          </div>
        </div>

        {/* --- Informasi Dasar --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              placeholder="Contoh: Air Mineral 600ml"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              SKU (Kode Unik) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              placeholder="Contoh: AM-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Harga (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              placeholder="0"
            />
          </div>
          {/* Input Ukuran */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Ukuran</label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black"
              placeholder="Contoh: 20x30 cm, Besar, Kecil"
            />
          </div>
        </div>

        {/* --- Inventaris --- */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-md font-semibold text-gray-800 mb-4">
            Inventaris
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Stok Awal</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black transition"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Bahan (Material)</label>
              <input
                type="text"
                name="material"
                value={formData.material}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black"
                placeholder="Contoh: Plastik, Besi, Kertas"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Min. Order <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                name="minOrder"
                value={formData.minOrder}
                onChange={handleChange}
                min="1"
                className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black transition"
                placeholder="1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Satuan Unit <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black transition"
                placeholder="Pcs / Box"
              />
            </div>
          </div>
        </div>

        {/* --- Detail Lainnya --- */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="space-y-1">
            <label className="text-sm font-medium">Deskripsi (Opsional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full border border-gray-300 p-2 rounded-md outline-none focus:border-black transition"
              placeholder="Jelaskan detail produk secara lengkap..."
            />
          </div>
        </div>

        {/* --- Tombol Simpan --- */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex items-center gap-2 px-8 py-3 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition shadow-md ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FaSave />
            {isLoading ? "Menyimpan..." : "Simpan Produk"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateKatalogPage;
