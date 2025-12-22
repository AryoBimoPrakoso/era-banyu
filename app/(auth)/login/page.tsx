"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { postApi } from "@/lib/apiClient";

// SVG
import logo from "@/public/assets/svg/logo-mobile.svg";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

const Login = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Feedback user
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // panggil endpoint login sesuai server.js dan authRoutes.js
      const response = await postApi("admin/auth/login", {
        username: username,
        password: password,
      });

      // jika berhasil simpan token di localStrorage
      localStorage.setItem("token", response.token);

      // simpan data admin
      if (response.admin) {
        localStorage.setItem("adminData", JSON.stringify(response.admin));
      }

      router.push("/dashboard");
    } catch (err: any) {
      // menampilkan pesan error jika username atau password salah
      setError(err.message || "Usename atau Password salah!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {/* CARD */}
      <form
        onSubmit={handleLogin}
        className="w-[350px] shadow border border-gray-100 rounded-2xl p-8 flex flex-col gap-6"
      >
        {/* LOGO + TITLE */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
            <Image src={logo} alt="Era Banyu Segara" className="w-10 h-10" />
          </div>
          <h1 className="font-medium text-lg">Era Banyu Segara</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-xs">
            {error}
          </div>
        )}

        {/* EMAIL */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm outline-none"
            required
          />
        </div>

        {/* PASSWORD */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Password</label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm outline-none pr-10"
            />

            {/* ICON */}
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700"
            >
              {showPassword ? (
                <FaRegEye className="text-xl" />
              ) : (
                <FaRegEyeSlash className="text-xl" />
              )}
            </button>
          </div>

          {/* Forgot password */}
          <Link href="/forgot-password" className="text-right">
            <button className="text-xs text-gray-600 hover:underline">
              forgot password?
            </button>
          </Link>
        </div>

        {/* LOGIN BUTTON */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 text-white rounded-md text-sm duration-300 ${
            isLoading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-black hover:bg-black/70"
          }`}
        >
          {isLoading ? "Loading..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
