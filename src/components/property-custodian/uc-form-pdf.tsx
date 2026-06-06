
"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DamagedItem, InventoryEntry } from "@/lib/types"
import { Check, Square } from "lucide-react"

type UcFormPdfProps = {
    type: "damaged" | "requisition"
    data: DamagedItem | InventoryEntry
}

export const UcFormPdf = React.forwardRef<HTMLDivElement, UcFormPdfProps>(({ type, data }, ref) => {
    const isDamaged = type === "damaged"
    const d = data as any

    return (
        <div ref={ref} className="bg-white text-black p-12 w-[210mm] min-h-[297mm] shadow-2xl mx-auto font-sans">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8 border-b-2 border-[#003399] pb-4">
                <div className="h-20 w-20 bg-[#003399] rounded-full flex items-center justify-center text-white font-bold text-4xl italic">UC</div>
                <div className="flex-1">
                    <h1 className="text-3xl font-black text-[#003399] leading-tight">University of Cebu – Banilad</h1>
                    <p className="text-sm font-bold text-gray-600 uppercase tracking-tighter">Banilad Campus, Cebu City</p>
                    <h2 className="text-xl font-bold mt-2 uppercase underline">
                        {isDamaged ? "RETURN SLIP / DAMAGE REPORT" : "REQUISITION FORM"}
                    </h2>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-500 uppercase">Document Code</p>
                    <p className="text-lg font-mono font-bold tracking-tighter">
                        {isDamaged ? `UCDMG-${d.id.slice(0,8)}` : d.requisitionRef}
                    </p>
                    <p className="text-xs mt-2 text-gray-500">DATE: {format(new Date(d.dateAdded || d.dateReceived), "M/d/yyyy")}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-6 mb-8">
                {isDamaged ? (
                    <table className="w-full border-collapse border border-black text-sm">
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 font-bold bg-gray-100 w-1/4">ITEM NAME</td>
                                <td className="border border-black p-2 w-3/4">{d.itemName}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-bold bg-gray-100">QUANTITY</td>
                                <td className="border border-black p-2">{d.quantity}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-bold bg-gray-100">SERIAL NUMBER</td>
                                <td className="border border-black p-2">{d.serialNumber}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-bold bg-gray-100">DEPARTMENT</td>
                                <td className="border border-black p-2">{d.department}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-bold bg-gray-100">REMARKS</td>
                                <td className="border border-black p-2 h-20 align-top">{d.remarks}</td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm font-bold uppercase">
                            <div>PURPOSE: <span className="underline ml-2 font-normal normal-case">{d.purpose}</span></div>
                            <div className="text-right">REQUESTED BY: <span className="underline ml-2 font-normal normal-case">{d.requestedBy}</span></div>
                        </div>
                        <table className="w-full border-collapse border border-black text-xs">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border border-black p-2 w-12">SEQ#</th>
                                    <th className="border border-black p-2">ITEM WITH COMPLETE DESCRIPTION</th>
                                    <th className="border border-black p-2 w-16">UOM</th>
                                    <th className="border border-black p-2 w-20">QUANTITY</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-2 text-center">1</td>
                                    <td className="border border-black p-2 h-32 align-top">{d.itemDescription}</td>
                                    <td className="border border-black p-2 text-center">{d.uom}</td>
                                    <td className="border border-black p-2 text-center">{d.quantity}</td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="border border-black p-2 text-center font-bold italic">... ENTRIES CLOSED ...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approval Flow Grid */}
            <div className="border-t-2 border-black pt-6">
                <div className="grid grid-cols-3 gap-8 text-[10px]">
                    {/* Column 1 */}
                    <div className="space-y-6">
                        <div>
                            <p className="font-bold uppercase mb-8">Department Head:</p>
                            <div className="border-b border-black text-center pb-1 text-xs">
                                {isDamaged ? d.notedBy : d.deptHead}
                            </div>
                            <p className="text-center font-bold">NAME / SIGNATURE</p>
                        </div>
                        <div className="border border-black p-2 rounded">
                            <p className="font-bold uppercase mb-2">Property Custodian's Note:</p>
                            <div className="flex items-center gap-2 mb-1">
                                {d.custodianNote === "Recommend" ? <Check className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                                <span>Recommend</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                {d.custodianNote === "Does not Recommend" ? <Check className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                                <span>Does not Recommend</span>
                            </div>
                            <p className="font-bold border-b border-black">MS. ANABETH U. VALENCIA</p>
                            <p className="mt-1">Date: {format(new Date(), "MM/dd/yy")}</p>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-6">
                        <div>
                            <p className="font-bold uppercase mb-4">Campus Director's Comment:</p>
                            <div className="border border-black h-20 p-2">
                                {/* Placeholder for comment */}
                            </div>
                        </div>
                        <div>
                            <p className="font-bold uppercase mb-2">Recommended Action:</p>
                            <div className="flex gap-4 mb-4">
                                <div className="flex items-center gap-1"><Square className="h-3 w-3"/> Approved</div>
                                <div className="flex items-center gap-1"><Square className="h-3 w-3"/> Disapproved</div>
                            </div>
                            <div className="border-b border-black mt-8"></div>
                            <p className="text-center font-bold">VICE-CHANCELLOR / CAMPUS ACADEMIC DIRECTOR</p>
                        </div>
                    </div>

                    {/* Column 3 */}
                    <div className="space-y-6">
                        <div>
                            <p className="font-bold uppercase mb-4">Final Decision:</p>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-1"><Square className="h-3 w-3"/> Approved</div>
                                <div className="flex items-center gap-1"><Square className="h-3 w-3"/> Disapproved</div>
                            </div>
                            <div className="border-b border-black mt-32"></div>
                            <p className="text-center font-bold">PRESIDENT / CHANCELLOR</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 flex justify-between text-[8px] font-mono text-gray-400 uppercase">
                <div>PRINTED ON {format(new Date(), "M/d/yyyy h:mm a")} BY {d.receivedBy || d.returnedBy || "USER"} @ 115.148.246.6. SFM-PRO-02</div>
                <div>1 OF 3</div>
            </div>
        </div>
    )
})
UcFormPdf.displayName = "UcFormPdf"
