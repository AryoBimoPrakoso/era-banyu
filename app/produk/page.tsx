import React from "react";
import bannerProduk from "@/public/assets/img/produk.jpg";
import Image from "next/image";
import dummyProdukImg from "@/public/assets/img/dummyProduk.jpg";
import Link from "next/link";

// Data Dummy
import { DummyProduk } from "./data/dummyProduk";

function toSlug(id: number, title: string) {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // hapus simbol
    .replace(/^-+|-+$/g, ""); // trim dash
  return `${id}-${sanitized}`;
}

interface Produk {
  id: number;
  title: string;
  price: number;
}


const Produk = () => {
  return (
    <div className="overflow-hidden h-screen">
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
          {DummyProduk.map((product) => (
            <div key={product.id}>
              <div className="bg-[#E6E6E6] w-full rounded-xl shadow-sm p-3 flex flex-col gap-2 md:gap-4">
                {/* IMAGE */}
                <Image
                  src={dummyProdukImg}
                  alt="Dummy Produk"
                  className="h-24 w-full lg:h-64 object-cover rounded-md"
                />

                {/* TEXT */}
                <div>
                  <h2 className="text-xs lg:text-base font-medium">{product.title}</h2>
                  <h2 className="text-sm lg:text-lg font-semibold">
                    Mulai Rp {product.price.toLocaleString()}
                  </h2>
                </div>

                {/* BUTTON */}
                <Link href={`/produk/${toSlug(product.id, product.title)}`}>
                  <button className="w-full py-1 lg:py-2 bg-primary text-white hover:brightness-75 duration-300 rounded-md text-sm">
                    Lihat Produk
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Produk;
