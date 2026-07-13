import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Filters() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input className="sm:max-w-sm" placeholder="Filtrar registros" />
      <Button variant="outline">
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
      </Button>
    </div>
  );
}
