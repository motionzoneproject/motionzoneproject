"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleGalleryItemActive } from "@/lib/actions/gallery";

interface ToggleActiveBtnProps {
  id: string;
  active: boolean;
}

export default function ToggleActiveBtn({ id, active }: ToggleActiveBtnProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await toggleGalleryItemActive(id, !active);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : active ? "Dölj" : "Visa"}
    </Button>
  );
}
