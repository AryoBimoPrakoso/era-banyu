"use client";
import Hero from "../components/client/Hero";
import About from "../components/client/About";

export default function Home() {

  return (
    <div className="overflow-hidden">
      <Hero />
      <About />
    </div>
  );
}
