"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  // Number of page links to show on either side of the current page, defaults to 1
  siblingCount?: number;
}

// A generic Pagination component that preserves existing URL search params.
// Example usage:
// <PaginationBar currentPage={page} totalPages={totalPages} />
export function PaginationBar({
  currentPage,
  totalPages,
  siblingCount = 1,
}: PaginationBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Don't render if there's one page or less
  if (totalPages <= 1) {
    return null;
  }

  // Helper to create URL with updated page parameter while preserving other params
  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Helper to calculate which page numbers to show on the Pagination bar
  const getPageNumbers = () => {
    const pages: (number | "ellipsis-left" | "ellipsis-right")[] = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const leftSibling = Math.max(currentPage - siblingCount, 2);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages - 1);

    // Show ellipsis after first page if needed
    if (leftSibling > 2) {
      pages.push("ellipsis-left");
    }

    // Show pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      pages.push(i);
    }

    // Show ellipsis before last page if needed
    if (rightSibling < totalPages - 1) {
      pages.push("ellipsis-right");
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous button */}
        <PaginationItem>
          {currentPage > 1 ? (
            <PaginationPrevious href={createPageURL(currentPage - 1)} />
          ) : (
            <PaginationPrevious
              href="#"
              className="pointer-events-none opacity-50"
              aria-disabled="true"
            />
          )}
        </PaginationItem>

        {/* Page numbers */}
        {pageNumbers.map((pageNum) => (
          <PaginationItem key={pageNum}>
            {pageNum === "ellipsis-left" || pageNum === "ellipsis-right" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href={createPageURL(pageNum)}
                isActive={pageNum === currentPage}
              >
                {pageNum}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next button */}
        <PaginationItem>
          {currentPage < totalPages ? (
            <PaginationNext href={createPageURL(currentPage + 1)} />
          ) : (
            <PaginationNext
              href="#"
              className="pointer-events-none opacity-50"
              aria-disabled="true"
            />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
