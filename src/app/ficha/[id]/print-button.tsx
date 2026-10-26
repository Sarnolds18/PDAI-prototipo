"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button type="button" variant="accent" onClick={() => window.print()}>
      <Printer className="h-5 w-5" /> Descargar PDF
    </Button>
  );
}
