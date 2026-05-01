import * as React from "react";

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Central Sun/Nucleus */}
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            
            {/* Multiple Concentric Orbits */}
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1" opacity="0.8" />
            <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            
            {/* Diagonal Orbit for dynamism */}
            <ellipse cx="12" cy="12" rx="11" ry="4" stroke="currentColor" strokeWidth="1" transform="rotate(-30 12 12)" opacity="0.3" />
        </svg>
    </div>
  );
}
