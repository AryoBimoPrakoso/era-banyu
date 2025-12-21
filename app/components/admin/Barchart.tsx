"use client";
import React from "react";
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer, // Gunakan ini agar responsif mengikuti div parent
} from "recharts";

type Props = {
  data: { range: string; sales: number }[];
  title: string; // Contoh: "November 2025"
};

const Barchart = ({ data, title }: Props) => {
  return (
    <div className="w-full h-[450px] bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Grafik Penjualan Produk - {title}</h1>
      
      {/* Container Chart */}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60, // Tambah bottom margin untuk label produk yang panjang
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            
            <XAxis 
              dataKey="range" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              label={{ position: 'bottom', value: 'Nama Produk', offset: 0, fill: '#9ca3af' }}
              // Jika nama produk panjang, bisa dipotong atau dirotasi
              interval={0} 
              angle={-15}
              textAnchor="end"
            />
            
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              label={{ 
                position: 'left', 
                value: 'Jumlah Terjual (Unit)', 
                angle: -90, 
                dy: 0,
                dx: -10,
                fill: '#9ca3af'
              }} 
            />
            
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            
            <Bar
              dataKey="sales"
              fill="#0099A5" // Warna batang hitam sesuai tema
              radius={[4, 4, 0, 0]}
              barSize={40}
              activeBar={<Rectangle fill="#333333" />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Barchart;