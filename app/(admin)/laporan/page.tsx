"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getApi, deleteApi } from "@/lib/apiClient";
import { Plus, Download, Trash2, Edit } from "lucide-react";
import Swal from "sweetalert2";

// Komponen filter
import MonthFilter from "@/app/components/admin/MonthFilter";
import YearFilter from "@/app/components/admin/YearFilter";
import StatusFilter from "@/app/components/admin/StatusFilter";

interface Order {
  id: string;
  nama: string;
  kontak: string;
  detail: string;
  jumlah: string;
  total: number;
  tanggalPesan: string;
  tanggalPembayaran: string;
  status: string;
}

// List Bulan Indonesia Static
const INDONESIA_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function LaporanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState("Semua");
  const [selectedYear, setSelectedYear] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");

  // Fetch Data
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await getApi("admin/orders", true);
      const data = response.data || response;
      setOrders(data);
    } catch (error) {
      console.error("Gagal mengambil data laporan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // --- 2. LOGIKA OPSI TAHUN (TAMBAHKAN "Semua") ---
  const yearOptions = useMemo(() => {
    const years = new Set<string>();

    // Selalu masukkan tahun saat ini
    years.add(new Date().getFullYear().toString());

    orders.forEach((order) => {
      if (order.tanggalPesan) {
        const d = new Date(order.tanggalPesan);
        if (!isNaN(d.getTime())) {
          years.add(d.getFullYear().toString());
        }
      }
    });

    const sortedYears = Array.from(years).sort().reverse();

    // Tambahkan "Semua" di paling atas list
    return ["Semua", ...sortedYears];
  }, [orders]);

  // --- 3. PERBARUI LOGIKA FILTERING ---
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // A. Filter Status
        if (filterStatus !== "Semua" && order.status !== filterStatus) {
          return false;
        }

        // Parsing Tanggal Order
        if (!order.tanggalPesan) return false;
        const d = new Date(order.tanggalPesan);
        if (isNaN(d.getTime())) return false;

        // B. Filter TAHUN
        // Jika "Semua", lewati pengecekan tahun
        const orderYear = d.getFullYear().toString();
        if (selectedYear !== "Semua" && orderYear !== selectedYear) {
          return false;
        }

        // C. Filter BULAN
        // Jika "Semua", lewati pengecekan bulan
        if (selectedMonth !== "Semua") {
          const orderMonthName = new Intl.DateTimeFormat("id-ID", {
            month: "long",
          }).format(d);
          // Bandingkan case-insensitive
          if (orderMonthName.toLowerCase() !== selectedMonth.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritas: Diproses di atas
        const aDiproses = a.status === "Diproses";
        const bDiproses = b.status === "Diproses";
        if (aDiproses && !bDiproses) return -1;
        if (!aDiproses && bDiproses) return 1;
        return 0;
      });
  }, [orders, filterStatus, selectedMonth, selectedYear]);

  // ... Helper Functions (handleDelete, handleExport, dll) ...
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Yakin hapus data?",
      text: "Data yang dihapus tidak bisa dikembalikan",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteApi(`admin/orders/${id}`, true);
      fetchOrders();

      await Swal.fire({
        title: "Berhasil",
        text: "Data berhasil dihapus",
        icon: "success",
      });
    } catch (e: any) {
      Swal.fire({
        title: "Gagal!",
        text: e?.message || "Terjadi kesalahan",
        icon: "error",
      });
    }
  };

  const handleExport = async () => {
    // ... logic export Anda ...
    // Note: Jika backend butuh filter spesifik saat export, Anda mungkin perlu menyesuaikan logic ini
    // Tapi jika export frontend (filter data yang ada), gunakan filteredOrders
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
        }/admin/orders/export/excel`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Gagal export excel");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Gagal!",
        text: "Gagal mengunduh Excel",
        icon: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Selesai":
        return "bg-green-100 text-green-800 border-green-200";
      case "Diproses":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Batal":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDateID = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50 min-h-screen">
      {/* HEADER + ACTIONS */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Pesanan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola dan pantau transaksi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* 1. Status Filter */}
          <div className="relative">
            <StatusFilter value={filterStatus} onChange={setFilterStatus} />
          </div>

          {/* 2. Month Filter */}
          <div className="w-full sm:w-auto">
            <MonthFilter
              value={selectedMonth}
              onChange={setSelectedMonth}
              // Tambahkan "Semua" ke opsi list bulan
              options={["Semua", ...INDONESIA_MONTHS]}
            />
          </div>

          {/* 3. Year Filter */}
          <div className="w-full sm:w-auto">
            <YearFilter
              value={selectedYear}
              onChange={setSelectedYear}
              // Options sudah termasuk "Semua" dari logic useMemo di atas
              options={yearOptions}
            />
          </div>

          <div className="w-px h-8 bg-gray-300 hidden sm:block self-center mx-1"></div>

          {/* Tombol Aksi */}
          <Link href="/laporan/create">
            <button className="flex items-center justify-center gap-2 px-5 py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition w-full sm:w-auto shadow-sm">
              <Plus className="w-5 h-5" />{" "}
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </Link>

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition w-full sm:w-auto shadow-sm"
          >
            <Download className="w-5 h-5" />{" "}
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            {/* HEADER */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  No
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Nama
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Kontak
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Detail
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Jumlah
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Tgl Pesan
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Tgl Bayar
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-500">
                    Tidak ada data yang sesuai filter 
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.nama}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.kontak}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[150px]">
                      {order.detail}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.jumlah}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatRupiah(order.total)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateID(order.tanggalPesan)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateID(order.tanggalPembayaran)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                      <Link href={`/laporan/edit?id=${order.id}`}>
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit size={16} />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <span>
            Menampilkan {filteredOrders.length} dari {orders.length} data
          </span>
          {/* Update info footer agar relevan */}
          <span>
            Filter: {selectedMonth} {selectedYear} • {filterStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
