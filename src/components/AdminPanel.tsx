"use client";
import Link from "next/link";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPanel() {
 const [search, setSearch] = useState("");

 const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
   setSearch(e.target.value);
   console.log(search);
 };

 const router = useRouter();
   return (
    <nav className="bg-white p-2 border-b-2 border-cyan-400">
      <div className="flex items-center space-x-6">
        <span className="text-gray-900 text-sm font-bold">Admin:</span>

        <ul className="flex space-x-4 text-sm">
          <li>
            <Link
              href="/admin/start"
              className="text-gray-800 hover:text-gray-900"
            >
              Startsida
            </Link>
          </li>
          <li>
            <Link
              href="/admin/omoss"
              className="text-gray-800 hover:text-gray-900"
            >
              Om oss
            </Link>
          </li>
          <li>
            <Link
              href="/admin/courses"
              className="text-gray-800 hover:text-gray-900"
            >
              Kurser
            </Link>
          </li>
          <li>
            <Link
              href="/admin/products"
              className="text-gray-800 hover:text-gray-900"
            >
              Produkter
            </Link>
          </li>
          <li>
            <Link
              href="/admin/events"
              className="text-gray-800 hover:text-gray-900"
            >
              Event
            </Link>
          </li>
          <li>
            <Link
              href="/admin/gallery"
              className="text-gray-800 hover:text-gray-900"
            >
              Galleri
            </Link>
          </li>
          <li>
            <Link
              href="/admin/students"
              className="text-gray-800 hover:text-gray-900"
            >
              Elever
            </Link>
          </li>
          <li>
            <Link
              href="/admin/schemas"
              className="text-gray-800 hover:text-gray-900"
            >
              Terminer / Scheman
            </Link>
          </li>
        </ul>
      </div>
      <div className=" w-full flex justify-between items-center">
        <ul className="flex gap-2 ml-auto">
          <li>
            <button
              className=" border-2 border-blue-700 rounded-md px-2 py-2 text-blue-700 cursor-pointer hover:bg-blue-200"
              onClick={() => redirect("/")}
            >
              <Link href="/">back</Link>
            </button>
          </li>
          <li>
            <input
              type="search"
              placeholder="Search"
              className=" border-2 border-blue-700 rounded-lg px-4 py-2 text-black "
              onChange={(e) => handleSearch(e)}
            />
          </li>
        </ul>
      </div>
    </nav>
  );
}
