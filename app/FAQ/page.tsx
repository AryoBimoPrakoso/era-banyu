import React from "react";
import Accordion from "../components/Accordion";
import emailLogo from "@/public/assets/svg/email.svg";
import teleponLogo from "@/public/assets/svg/telepon.svg";
import Image from "next/image";

const FAQ = () => {
  return (
    <section className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Judul utama */}
        <div className="text-center mb-16 lg:mb-20">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Sering Ditanyakan
          </h1>
          <p className="mt-6 text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Jika ada pertanyaan lain, jangan ragu untuk menghubungi kami melalui
            WhatsApp atau email
          </p>
        </div>

        {/* Layout 2 kolom: Teks kiri + Accordion kanan */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
          {/* KIRI - Teks & Kontak */}
          <div className="flex-1 space-y-10 order-2 lg:order-1">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-5xl font-medium text-gray-800">
                Punya Pertanyaan <br />
                <span className="text-primary">Lain?</span>
              </h2>
              <p className="text-sm lg:text-lg text-gray-600 leading-relaxed">
                Kami siap membantu menjawab semua pertanyaan seputar produk,
                harga, pengiriman, hingga custom order. Jangan ragu untuk
                menghubungi kami ya!
              </p>
            </div>

            {/* Kontak */}
            <div className="space-y-5">
              <a
                href="mailto:erabanyusegara@gmail.com"
                className="flex items-center gap-4 text-lg group hover:text-primary transition"
              >
                <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition">
                  <Image src={emailLogo} alt="Email" width={24} height={24} />
                </div>
                <span className="text-sm lg:text-lg">erabanyusegara@gmail.com</span>
              </a>

              <a
                href="https://wa.me/6281234567899"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 text-lg group hover:text-green-600 transition"
              >
                <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition">
                  <Image
                    src={teleponLogo}
                    alt="WhatsApp"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-sm lg:text-lg">0812-3456-7899</span>
              </a>
            </div>
          </div>

          {/* KANAN - Accordion FAQ */}
          <div className="flex-1 order-1 lg:order-2">
            <Accordion />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
