"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StarIcon, StarOffIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleUniverseProfileDefaultAction } from "@/features/universe";

export function ToggleDefaultButton({
  universeProfileId,
  initialIsDefault,
}: {
  universeProfileId: string;
  initialIsDefault: boolean;
}) {
  const router = useRouter();
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleUniverseProfileDefaultAction({ universeProfileId });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setIsDefault(result.data.isDefault);
      toast.success(
        result.data.isDefault ? "Als Standard markiert" : "Standard entfernt",
      );
      router.refresh();
    });
  };

  return (
    <Button
      variant={isDefault ? "default" : "outline"}
      onClick={handleToggle}
      disabled={isPending}
      data-testid="universe-detail-toggle-default"
    >
      {isDefault ? <StarIcon /> : <StarOffIcon />}
      {isDefault ? "Standard" : "Als Standard markieren"}
    </Button>
  );
}
