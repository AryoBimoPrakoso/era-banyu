import Image from "next/image";
import React from "react";
import Link from "next/link";

// SVG
import EraBanyuLogo from "@/public/assets/svg/logo.svg";
import emailLogo from "@/public/assets/svg/email.svg";
import teleponLogo from "@/public/assets/svg/telepon.svg";
import lokasiLogo from "@/public/assets/svg/lokasi.svg";

const Footer = () => {
  return (
    <div className="w-full font-light bg-[#F2F0EF]">
      <div className="flex flex-col md:flex-row justify-between px-6 md:px-14 py-8 gap-8 text-sm md:text-base">
        <div className="flex flex-col gap-5 w-full">
          <Image src={EraBanyuLogo} alt="Era Banyu Segara" className="w-56" />
          <ul className="flex flex-col gap-4 ">
            <li className="flex gap-2 items-center">
              <Image src={emailLogo} alt="email" />
              erabanyusegara@gmail.com
            </li>
            <li className="flex gap-2 items-center">
              <Image src={teleponLogo} alt="telepon" />
              081234567899
            </li>
            <li className="flex gap-2 items-center">
              <Image src={lokasiLogo} alt="lokasi" />
              Hegarmukti, Cikarang Pusat, Bekasi - Jawa Barat 17530
            </li>
          </ul>
        </div>
        <div className="flex w-full justify-between">
          <div className="flex flex-col gap-5">
            <h1 className="font-bold text-lg items-center">Peta Situs</h1>
            <ul className="flex flex-col gap-4">
              <Link href="/" className="flex gap-2 items-center">Beranda</Link>
              <Link href="/" className="flex gap-2 items-center">Tentang Kami</Link>
              <Link href="/produk" className="flex gap-2 items-center">Produk</Link>
              <Link href="/FAQ" className="flex gap-2 items-center">FAQ</Link>

            </ul>
          </div>
          <div className="flex flex-col gap-5">
            <h1 className="font-bold text-lg items-center">Dukungan</h1>
            <ul className="flex flex-col gap-4">
              <li className="flex gap-2 items-center">Syarat dan Ketentuan</li>
              <li className="flex gap-2 items-center">Kebijakan Privasi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
