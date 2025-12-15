"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { searchCourses } from "@/lib/search-courses";

export default function SearchBar() {
  const [search, setSearch] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    const fetchCourses = async () => {
      const courses = await searchCourses(search);
      // setCourses(courses);
      console.log(JSON.stringify(courses));
    };
    fetchCourses();
  }, [search]);

  return (
    <div className=" bg-secondary-foreground p-4 mt-4 flex justify-between  items-center">
      <div className=" gap-4 items-center">
        <label className="text-black font-bold" htmlFor="search">
          Search:{" "}
        </label>
        <input
          type="search"
          placeholder="Write course name"
          className="border-2 border-red-700 rounded-lg px-4 py-2 text-black"
          onChange={handleInputChange}
        />
        <button
          type="button"
          className="border-2 border-secondary-700 rounded-md px-2 py-2 text-blue-700 cursor-pointer hover:bg-blue-200 ml-auto"
        >
          Submit
        </button>
      </div>

      <button
        type="button"
        className="border-2 border-secondary-700 rounded-md px-2 py-2 text-blue-700 cursor-pointer hover:bg-blue-200 ml-auto"
      >
        <Link href="/">Back Home</Link>
      </button>
    </div>
  );
}
