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
            <path
            d="M5.5 17L3.75 16.25M5.5 17C5.83333 17.5833 6.5 18.5 8 18.5M5.5 17V7M18.5 17L20.25 16.25M18.5 17C18.1667 17.5833 17.5 18.5 16 18.5M18.5 17V7M13 18.5V14.5M11 18.5V14.5M8 18.5C6.5 18.5 5.83333 17.5833 5.5 17M8 18.5H16M16 18.5C17.5 18.5 18.1667 17.5833 18.5 17M8 5.5H16M8 5.5C6.5 5.5 5.5 6.5 5.5 7M8 5.5V3.5M16 5.5C17.5 5.5 18.5 6.5 18.5 7M16 5.5V3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            />
        </svg>
    </div>
  );
}
