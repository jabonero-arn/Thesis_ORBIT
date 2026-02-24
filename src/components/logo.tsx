import * as React from "react";
import { BeakerIcon } from "lucide-react";

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BeakerIcon className="h-5 w-5" />
    </div>
  );
}
