import * as React from "react";
import { Cpu } from "lucide-react";

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Cpu className="h-6 w-6" />
    </div>
  );
}
