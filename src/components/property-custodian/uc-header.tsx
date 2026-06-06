
"use client"

import { Logo } from "@/components/logo"

export function UcHeader({ office = "OFFICE OF THE PROPERTY CUSTODIAN" }: { office?: string }) {
    return (
        <div className="flex flex-col items-center text-center py-6 border-b-2 border-[#003399] mb-8 bg-white text-black rounded-t-xl">
            <div className="flex items-center gap-4 mb-2">
                <Logo className="h-16 w-16 text-[#003399]" />
                <div className="text-left">
                    <h1 className="text-3xl font-bold tracking-tight text-[#003399]">University of Cebu – Banilad</h1>
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-widest">Banilad Campus, Cebu City</p>
                </div>
            </div>
            <div className="mt-4 px-8 py-1 bg-[#003399] text-white rounded-full">
                <h2 className="text-lg font-bold uppercase tracking-widest">{office}</h2>
            </div>
        </div>
    )
}
