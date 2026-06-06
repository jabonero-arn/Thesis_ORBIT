
"use client"

import { format } from "date-fns"
import { useUser } from "@/firebase"

export function UcFooter() {
    const { user } = useUser()
    const now = new Date()
    
    return (
        <div className="mt-12 pt-4 border-t border-gray-300 text-[10px] text-gray-500 font-mono flex justify-between uppercase">
            <div>
                PRINTED ON {format(now, "M/d/yyyy h:mm a")} BY {user?.displayName || "SYSTEM USER"} @ 115.148.246.6
            </div>
            <div>SFM-PRO-02</div>
        </div>
    )
}
