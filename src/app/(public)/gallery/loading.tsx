export default function Loading() {
  return (
    <main className="bg-background">
      <section className="py-16 md:py-20 text-center border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mx-auto w-1/3 h-12 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded" />
          <div className="mx-auto mt-4 w-2/3 h-4 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded" />
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-8 w-1/3 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded mx-auto" />
              <div className="h-[50vh] bg-gray-200 dark:bg-neutral-700 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
