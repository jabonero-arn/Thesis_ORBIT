
"use client"

import * as React from "react"
import { UcHeader } from "@/components/property-custodian/uc-header"
import { UcFooter } from "@/components/property-custodian/uc-footer"
import { UcFormPdf } from "@/components/property-custodian/uc-form-pdf"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Printer, Trash2 } from "lucide-react"
import type { InventoryEntry } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export default function InventoryPage() {
    const { toast } = useToast()
    const [entries, setEntries] = React.useState<InventoryEntry[]>([])
    const [search, setSearch] = React.useState("")
    const [isAdding, setIsAdding] = React.useState(false)
    
    const pdfRef = React.useRef<HTMLDivElement>(null)
    const [activePdfEntry, setActivePdfEntry] = React.useState<InventoryEntry | null>(null)

    // Load from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem('uc_inventory_entries')
        if (saved) setEntries(JSON.parse(saved))
    }, [])

    // Save to localStorage
    React.useEffect(() => {
        localStorage.setItem('uc_inventory_entries', JSON.stringify(entries))
    }, [entries])

    const handleAddEntry = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        const newEntry: InventoryEntry = {
            id: Math.random().toString(36).substr(2, 9),
            itemDescription: formData.get("itemDescription") as string,
            uom: formData.get("uom") as string,
            quantity: parseFloat(formData.get("quantity") as string),
            dateReceived: formData.get("dateReceived") as string,
            receivedBy: formData.get("receivedBy") as string,
            requisitionRef: formData.get("requisitionRef") as string || `UCBRQT${Date.now().toString().slice(-12)}`,
            purpose: formData.get("purpose") as string,
            requestedBy: formData.get("requestedBy") as string,
            deptHead: formData.get("deptHead") as string,
            status: "Verified",
            custodianNote: "Recommend"
        }

        setEntries([newEntry, ...entries])
        setIsAdding(false)
        toast({ title: "Entry Recorded", description: "Inventory entry added to requisition log." })
    }

    const downloadPdf = async (entry: InventoryEntry) => {
        setActivePdfEntry(entry)
        
        setTimeout(async () => {
            if (!pdfRef.current) return
            
            const canvas = await html2canvas(pdfRef.current, { scale: 2 })
            const imgData = canvas.toDataURL("image/png")
            const pdf = new jsPDF("p", "mm", "a4")
            const imgProps = pdf.getImageProperties(imgData)
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
            
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
            pdf.save(`UC-Requisition-${entry.requisitionRef}.pdf`)
            
            setActivePdfEntry(null)
            toast({ title: "Official Form Exported" })
        }, 100)
    }

    const filteredEntries = entries.filter(e => 
        e.itemDescription.toLowerCase().includes(search.toLowerCase()) ||
        e.requisitionRef.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-[#f4f7fa] p-4 md:p-8 flex flex-col font-sans">
            <div className="max-w-6xl mx-auto w-full">
                <UcHeader office="LABORATORY REQUISITION LOG" />

                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Search requisition ref or item..." 
                            className="pl-10 bg-white" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Dialog open={isAdding} onOpenChange={setIsAdding}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#FFCC00] hover:bg-[#e6b800] text-black font-black uppercase">
                                <Plus className="mr-2 h-5 w-5" /> New Requisition Entry
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-[#003399]">UC Requisition Log Entry</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddEntry} className="grid grid-cols-2 gap-6 mt-4">
                                <div className="col-span-2 space-y-2">
                                    <Label className="font-bold uppercase text-[10px] text-gray-500">Official Purpose</Label>
                                    <Input name="purpose" placeholder="e.g., FOR CSS NCII ASSESSMENT OF CIT-U" required />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold uppercase text-[10px] text-gray-500">Requested By</Label>
                                    <Input name="requestedBy" required />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold uppercase text-[10px] text-gray-500">Dept Head Acknowledgment</Label>
                                    <Input name="deptHead" required />
                                </div>
                                <div className="col-span-2 border-t pt-4">
                                    <h4 className="font-black text-[#003399] uppercase text-sm mb-4">Item Particulars</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-3 space-y-2">
                                            <Label>Complete Description</Label>
                                            <Input name="itemDescription" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>UOM</Label>
                                            <Input name="uom" placeholder="PCS, BOX, etc." required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Quantity</Label>
                                            <Input name="quantity" type="number" step="0.01" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Requisition Ref#</Label>
                                            <Input name="requisitionRef" placeholder="Auto-generated if empty" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date Received</Label>
                                    <Input name="dateReceived" type="date" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Received By (Lab Supervisor)</Label>
                                    <Input name="receivedBy" required />
                                </div>
                                <div className="col-span-2 pt-4">
                                    <Button type="submit" className="w-full bg-[#003399] font-bold text-white uppercase tracking-widest">Post to Inventory Log</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="bg-white shadow-xl border-none overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#003399]">
                            <TableRow>
                                <TableHead className="text-white font-bold uppercase text-xs">SEQ</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">REF#</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">ITEM DESCRIPTION</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs text-center">UOM</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs text-center">QTY</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs text-right">ACTION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map((entry, idx) => (
                                <TableRow key={entry.id} className="border-b">
                                    <TableCell className="font-mono text-xs">{filteredEntries.length - idx}</TableCell>
                                    <TableCell className="font-bold text-xs">{entry.requisitionRef}</TableCell>
                                    <TableCell>
                                        <div className="text-sm font-semibold">{entry.itemDescription}</div>
                                        <div className="text-[10px] text-gray-500 italic">BY: {entry.receivedBy} ON {entry.dateReceived}</div>
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-bold">{entry.uom}</TableCell>
                                    <TableCell className="text-center text-xs font-black">{entry.quantity}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" className="border-[#003399] text-[#003399] hover:bg-blue-50" onClick={() => downloadPdf(entry)}>
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                <UcFooter />
            </div>

            {/* Hidden PDF container */}
            <div className="fixed -left-[2000px] top-0 overflow-hidden">
                {activePdfEntry && <UcFormPdf type="requisition" data={activePdfEntry} ref={pdfRef} />}
            </div>
        </div>
    )
}
