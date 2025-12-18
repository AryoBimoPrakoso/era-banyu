"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[]; // List tahun (misal: ["2025", "2024"])
};

const YearFilter = ({ value, onChange, options }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative z-[50]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition w-full sm:w-auto shadow-sm"
      >
        <span className="truncate">{value || "Pilih Tahun"}</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      <div
        className={`
          absolute mt-2 w-full max-h-60 overflow-y-auto rounded-md bg-white shadow-lg border border-gray-100
          transform transition-all duration-200 ease-out origin-top-right
          ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        {options.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">No Data</div>
        ) : (
          options.map((y) => (
            <button
              key={y}
              onClick={() => {
                onChange(y);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                y === value ? "bg-black text-white" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {y}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default YearFilter;