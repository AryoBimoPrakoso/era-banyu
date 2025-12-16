// app/(admin)/layout.tsx
import React from "react";
import type { Metadata } from "next";
import AdminProtectedLayout from "../components/admin/adminProtectedLayout";

// Sekarang Anda BISA menggunakan metadata di sini
export const metadata: Metadata = {
  title: "Admin Dashboard | Era Banyu Segara",
  description: "Halaman administrasi untuk manajemen produk dan pesanan.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Kita bungkus children dengan Client Component yang berisi logika auth
    <AdminProtectedLayout>
      {children}
    </AdminProtectedLayout>
  );
}