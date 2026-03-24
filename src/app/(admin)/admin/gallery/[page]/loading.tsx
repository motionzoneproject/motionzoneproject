export default function Loading() {
  return (
    <div className="p-6 w-full">
      <div className="max-w-5xl mx-auto">
        <div className="h-10 w-1/2 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="p-4 border rounded bg-transparent">
              <div className="h-40 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
