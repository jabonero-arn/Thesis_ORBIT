import * as React from "react";

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Central Nucleus */}
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            
            {/* Core Circular Orbits */}
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1" opacity="0.8" />
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            
            {/* Dynamic Elliptical Orbits */}
            <ellipse cx="12" cy="12" rx="10" ry="3.5" stroke="currentColor" strokeWidth="1.2" transform="rotate(-45 12 12)" opacity="0.7" />
            <ellipse cx="12" cy="12" rx="10" ry="3.5" stroke="currentColor" strokeWidth="1" transform="rotate(45 12 12)" opacity="0.4" />
            <ellipse cx="12" cy="12" rx="11" ry="2.5" stroke="currentColor" strokeWidth="0.8" transform="rotate(0 12 12)" opacity="0.3" />
        </svg>
    </div>
  );
}
