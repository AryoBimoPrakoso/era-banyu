"use client";
import { ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

type StatusFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

const status = ["Semua", "Diproses", "Batal", "Selesai"];

const StatusFilter = ({ value, onChange }: StatusFilterProps) => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenStatus(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative z-[50]">
      <button
        onClick={() => setOpenStatus((v) => !v)}
        className="flex items-center justify-between gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition w-full sm:w-auto shadow-sm"
      >
        <span>{value}</span>
        <span className={`transition-transform duration-200 ${openStatus ? "rotate-180" : ""}`}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <div
        className={`
          absolute mt-2 w-full max-h-60 overflow-y-auto rounded-md bg-white shadow-lg border border-gray-100
          transform transition-all duration-200 ease-out origin-top-right
          ${
            openStatus
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          }
        `}
      >
        {status.map((s) => (
          <button
            key={s}
            onClick={() => {
              onChange(s);
              setOpenStatus(false);
            }}
            className={`block w-full px-4 py-2 text-left text-sm  transition-colors ${
              s === value ? "bg-gray-100 " : "text-gray-400 hover:text-black"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatusFilter;
