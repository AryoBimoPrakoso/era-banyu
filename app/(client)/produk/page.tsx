"use client";
import React, { use, useEffect, useState } from "react";
import bannerProduk from "@/public/assets/img/produk.jpg";
import Image from "next/image";
import Link from "next/link";

// Data Dummy
import { getApi } from "@/lib/apiClient";

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

const Produk = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await getApi("products", false);
      const dataProduk = res.data || res;
      setProducts(dataProduk);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="overflow-hidden h-full">
      {/* Banner */}
      <div className="w-full">
        <Image
          src={bannerProduk}
          alt="Banner"
          className="h-[200px] md:h-[250px] w-full object-cover"
        />
      </div>

      {/* Grid Produk */}
      <div className="container mx-auto py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-8 justify-center">
          {products.map((product) => (
            <div className="bg-[#E6E6E6] w-full rounded-xl shadow-sm p-3 flex flex-col gap-2 md:gap-4" key={product.id}>
              {/* IMAGE */}
              <Image
                src={product.imageUrl}
                alt="Dummy Produk"
                className="w-full h-full object-cover rounded-md"
                width={24}
                height={24}
              />

              {/* TEXT */}
              <div>
                <h2 className="text-xs lg:text-base font-medium">{product.name}</h2>
                <h2 className="text-sm lg:text-lg font-semibold">Mulai {formatPriceIDR(product.price)} </h2>
              </div>

              {/* BUTTON */}
              <Link href={`/produk/${product.id}`}>
                <button className="w-full py-1 lg:py-2 bg-primary text-white hover:brightness-75 duration-300 rounded-md text-sm">
                  Lihat Produk
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Produk;
