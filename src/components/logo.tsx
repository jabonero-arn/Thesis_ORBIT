import * as React from "react";

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    </div>
  );
}
