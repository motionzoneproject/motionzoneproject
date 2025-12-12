"use client";

import Link from "next/link";
import { useState } from "react";

export default function SearchBar() {
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    console.log(search);
  };

  return (
    <div className=" w-full flex justify-between items-center">
      <ul className="flex gap-2 ml-auto">
        <li>
          <button
            className=" border-2 border-blue-700 rounded-md px-2 py-2 text-blue-700 cursor-pointer hover:bg-blue-200"
            type="submit"
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
  );
}
