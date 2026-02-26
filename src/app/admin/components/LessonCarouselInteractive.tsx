"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

interface LessonCarouselInteractiveProps {
  children: React.ReactNode;
  initialScrollIndex: number;
}

export function LessonCarouselInteractive({
  children,
  initialScrollIndex,
}: LessonCarouselInteractiveProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Scroll to the initial index on mount
  React.useEffect(() => {
    if (scrollContainerRef.current && initialScrollIndex >= 0) {
      const container = scrollContainerRef.current;
      const cardWidth = 300; // Approximate width of a card + gap
      const scrollPos = initialScrollIndex * cardWidth;

      // Attempt to center it:
      const containerWidth = container.clientWidth;
      const centeredPos = scrollPos - containerWidth / 2 + cardWidth / 2;

      container.scrollTo({
        left: Math.max(0, centeredPos),
        behavior: "smooth",
      });
    }
  }, [initialScrollIndex]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full group">
      {/* Scroll Left Button */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 p-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>

      {/* Scroll Right Button */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={scrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
