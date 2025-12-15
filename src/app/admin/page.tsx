import SearchBar from "@/components/search-database";

export default function HomePage() {
  return (
    <div className="container mx-auto mt-12 min-h-screen bg-slate-400 items-center justify-center flex flex-col">
      <h1 className="text-xl font-bold mb-4">Welcome to the Search User</h1>
      <SearchBar /> {/* Render the SearchBar component */}
    </div>
  );
}
