"use client";

interface Props {
  currentPage: number;
  totalPages: number;
}

export default function AdminGalleryPagination({
  currentPage,
  totalPages,
}: Props) {
  if (totalPages <= 1) return null;

  const createPageURL = (page: number) => {
    // use path-based pagination: /admin/gallery/<page>
    const base = window.location.origin;
    return `${base}/admin/gallery/${page}`;
  };

  const goto = (page: number) => {
    // full navigation to ensure server renders correct data
    window.location.href = createPageURL(page);
  };

  const pages = [] as number[];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center">
      <div className="inline-flex gap-2">
        <button
          type="button"
          className={`px-3 py-1 rounded border ${currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          onClick={() => goto(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Föregående
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`px-3 py-1 rounded border ${p === currentPage ? "bg-primary text-white" : "cursor-pointer"}`}
            onClick={() => goto(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className={`px-3 py-1 rounded border ${currentPage === totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          onClick={() => goto(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Nästa
        </button>
      </div>
    </nav>
  );
}
