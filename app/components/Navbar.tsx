"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { IoClose } from "react-icons/io5";
import { AiOutlineMenu } from "react-icons/ai";

import EraBanyuLogo from "@/public/assets/svg/logo.svg";
import EraBanyuLogoMobile from "@/public/assets/svg/logo-mobile.svg";

const Navbar = () => {
  const [nav, setNav] = useState(false);
  const [shadow, setShadow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShadow(window.scrollY >= 100);
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Navbar */}
      <div
        className={`fixed w-screen bg-white z-[999] transition-shadow duration-300 ${
          shadow ? "shadow-md" : ""
        }`}
      >
        <div className="flex px-8 md:px-14 py-4 justify-between items-center">
          <Image
            src={EraBanyuLogo}
            alt="Era Banyu Segara"
            className="w-64 hidden lg:flex"
          />
          <Image
            src={EraBanyuLogoMobile}
            alt="Era Banyu Segara"
            className="w-8 flex lg:hidden order-2"
          />

          {/* Desktop Menu */}
          <div className="hidden lg:flex gap-5 text-[20px]">
            <Link href="/" className="hover:opacity-75">
              Beranda
            </Link>
            <Link
              href="/"
              onClick={() => {
                setNav(false);
                sessionStorage.setItem("scrollTo", "tentang-kami");
              }}
            >
              Tentang
            </Link>
            <Link href="/produk" className="hover:opacity-75">
              Produk
            </Link>
            <Link href="/FAQ" className="hover:opacity-75">
              FAQ
            </Link>
          </div>

          {/* Mobile Icon */}
          <div
            className="flex lg:hidden text-2xl font-bold cursor-pointer"
            onClick={() => setNav(!nav)}
          >
            {nav ? <IoClose /> : <AiOutlineMenu />}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden fixed top-0 h-full w-[70%] bg-white shadow-lg 
        transition-transform duration-300 z-[998] 
        ${nav ? "-translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col p-6 gap-6 text-lg font-medium mt-12">
          <Link href="/" onClick={() => setNav(false)}>
            Beranda
          </Link>
          <Link
            href="/"
            onClick={() => {
              setNav(false);
              sessionStorage.setItem("scrollTo", "tentang-kami");
            }}
          >
            Tentang
          </Link>
          <Link href="/produk" onClick={() => setNav(false)}>
            Produk
          </Link>
          <Link href="/FAQ" onClick={() => setNav(false)}>
            FAQ
          </Link>
        </div>
      </div>

      {/* Overlay (biar UX lebih enak) */}
      {nav && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-[997]"
          onClick={() => setNav(false)}
        ></div>
      )}
    </>
  );
};

export default Navbar;
