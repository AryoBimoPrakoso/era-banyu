import React from "react";
import Image from "next/image";
import layananImg from "@/public/assets/img/service.jpg";

const daftarLayananArray = [
  "Pengemasan industri",
  "Pengemasan otomotif, alat musik, dan peralatan",
  "Pengemasan makanan dan minuman",
  "Pengemasan peralatan medis dan tekstil",
  "Pengemasan panel surya dan suku cadang elektronik",
  "Pengemasan logistik, plastik, kertas, dan perlengkapan kantor",
];

const About = () => {
  return (
    <section id="about" className="scroll-mt-24">
      <div className="bg-primary text-white">
        <div className="md:p-14 p-6 py-14 flex flex-col md:flex-row justify-between gap-8">
          <h1 className="text-4xl">Tentang Kami</h1>
          <p className="md:w-1/2 md:text-2xl text-lg font-light leading-tight">
            PT. ERA BANYU SEGARA menyediakan solusi pengemasan yang dirancang
            khusus untuk berbagai bisnis di berbagai industri. Mulai dari
            pengemasan industri hingga pengemasan produk makanan, medis, dan
            elektronik, kami memberikan solusi berkualitas tinggi yang dapat
            disesuaikan, dirancang untuk melindungi dan menyajikan produk Anda
            dengan presisi.
          </p>
        </div>
      </div>
      <div id="layanan">
        <div className="h-full py-14 md:px-14 px-6 ">
          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-[24px]">
              <div>
                <h1 className="text-4xl font-medium">
                  Kami menyediakan <br />
                  <span className="text-[#0099A5]">kemasan</span> untuk :
                </h1>
              </div>
              <div className="flex flex-row justify-between gap-[56px]">
                <div className="w-full flex flex-col">
                  {daftarLayananArray.map((layanan, index) => (
                    <div
                      key={index}
                      className="py-2 h-full border-b border-black/30 justify-center font-medium"
                    >
                      <h2 className="flex md:text-2xl text-lg items-center h-full font-light">
                        {layanan}
                      </h2>
                    </div>
                  ))}
                </div>
                <div className="w-96 hidden md:flex">
                  <Image
                    src={layananImg}
                    alt="Carton Box"
                    className="w-full h-full object-cover rounded-lg "
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
