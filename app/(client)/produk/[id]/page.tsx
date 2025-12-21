"use client";
import { getApi } from "@/lib/apiClient";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import React, { use, useEffect, useState } from "react";
import iconWhatsapp from "@/public/assets/svg/ic_round-whatsapp.svg";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  description?: string;
  material?: string;
  size?: string;
  minOrderQuantity?: number;
  unit: number;
}

const formatPriceIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);

const ProductDetail = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await getApi(`admin/products/${id}`, true);
      const dataProduk = res.data || res;
      setProduct(dataProduk);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProducts();
    }
  }, [id]);

  // 1. Handle Loading
  if (isLoading) return <div>Loading...</div>;

  // 2. Handle Error
  if (error) return <div className="text-red-500">{error}</div>;

  // 3. Handle Jika Data Kosong (SOLUSI ERROR ANDA)
  // Tanpa baris ini, TypeScript akan komplain 'product is possibly null'
  if (!product) {
    return <div>Data produk tidak ditemukan.</div>;
  }
  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-12 pt-32">
      {/* Wrapper utama: full height (minus padding), center horizontally & vertically */}
      <div className="max-w-7xl mx-auto h-full flex items-center justify-center">
        {/* Card utama - sedikit shadow biar cantik */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden w-full">
          {/* Back button + isi */}
          <div className="p-8 lg:p-12">
            {/* BACK BUTTON */}
            <button className="flex items-center gap-3 text-lg font-medium mb-8 hover:text-gray-600 transition">
              <ArrowLeft /> {product.name}
            </button>

            {/* GRID LAYOUT - 2 KOLOM (image + content) */}
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              {/* LEFT - IMAGE */}
              <div className="flex justify-center">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full max-w-md rounded-2xl object-cover shadow-md"
                />
              </div>

              {/* RIGHT - CONTENT */}
              <div className="flex flex-col gap-8">
                {/* Judul & Harga */}
                <div className="space-y-3">
                  <h1 className="text-2xl lg:text-3xl font-bold">
                    {product.name}
                  </h1>
                  <p className="text-3xl lg:text-4xl font-bold text-primary">
                    Rp {product.price.toLocaleString()}
                  </p>
                </div>

                {/* Deskripsi */}
                <p className="text-gray-600 text-base lg:text-lg leading-relaxed">
                  {product.description}
                </p>

                {/* Keterangan Produk */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Keterangan Produk</h2>
                  <div className="space-y-3 text-gray-700">
                    <div className="flex">
                      <span className="font-medium w-40">Bahan</span>
                      <span className="mr-4">:</span>
                      <span>{product.material}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-40">Ukuran</span>
                      <span className="mr-4">:</span>
                      <span>Sesuai permintaan customer</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-40">Min. Pesanan</span>
                      <span className="mr-4">:</span>
                      <span>{product.minOrderQuantity} pcs</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Button */}
                <a
                  href={`https://wa.me/6281289505095?text=Halo,%20saya%20mau%20pesan%20${encodeURIComponent(
                    product.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-[#25D366] text-white px-6 py-4 rounded-xl font-medium text-lg hover:brightness-90 transition shadow-md w-fit"
                >
                  <Image src={iconWhatsapp} alt="WA" width={28} height={28} />
                  Pesan via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
