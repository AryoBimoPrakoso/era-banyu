import Image from "next/image";
import React from "react";
import HeroLanding from "@/public/assets/img/hero.jpg";
import { GoArrowUpRight } from "react-icons/go";

const Hero = () => {
  return (
    <section
      className="p-8 md:p-14 relative h-screen bg-cover bg-center z-0"
      style={{ backgroundImage: `url(${HeroLanding.src})` }}
    >
      <div className="flex flex-col justify-center md:gap-6 h-full md:px-14">
        <h1 className="text-7xl md:text-9xl font-bold text-white mb-[24px]">
          Packaging <br /> Beyond the <span className="text-primary">Box!</span>
        </h1>
        <div className="flex items-center gap-1">
          <button className="bg-primary flex py-2 px-4 md:px-6 md:py-2 md:text-2xl font-reguler rounded-xl hover:drop-shadow-md duration-300 hover:brightness-75 items-center text-white">
            Lihat produk <GoArrowUpRight />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
