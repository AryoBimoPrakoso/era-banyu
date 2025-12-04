"use client"
import Hero from "./components/Hero";
import About from "./components/About";
import { useEffect } from "react";

export default function Home() {

  useEffect(() => {
    const target = sessionStorage.getItem("scrollTo");
    if(target) {
      const el = document.getElementById(target);
      if(el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      sessionStorage.removeItem("scrollTo");
    }
  }, []);
  return (
    <div className="overflow-hidden">
      <Hero/>
      <About/>
    </div>
  );
}
