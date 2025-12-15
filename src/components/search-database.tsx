"use client";

import { useState } from "react";
import { saveSearch } from "@/lib/actions/searchsave"; // Import the server action

export default function SearchBar() {
  const [search, setSearch] = useState(""); // Holds the search query
  const [loading, setLoading] = useState(false); // Track loading state
  const [error, setError] = useState<string | null>(null); // Error message state

  const handleSearch = async () => {
    if (!search.trim()) return; // Avoid empty searches

    setLoading(true);
    setError(null);

    try {
      // Call the server action to save the search query
      await saveSearch(search);
      setSearch(""); // Clear input after successful submission
    } catch (err) {
      console.error("Error saving search:", err);
      setError("Failed to save search. Please try again."); // Show error message
    } finally {
      setLoading(false); // Stop loading state
    }
  };

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
        className="border-2 p-2 rounded-md"
      />
      <button
        type="button"
        onClick={handleSearch}
        disabled={loading}
        className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md"
      >
        {loading ? "Saving..." : "Search"}
      </button>

      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}
