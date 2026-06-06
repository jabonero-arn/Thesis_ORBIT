
"use client"

import * as React from "react"
import { UcHeader } from "@/components/property-custodian/uc-header"
import { UcFooter } from "@/components/property-custodian/uc-footer"
import { UcFormPdf } from "@/components/property-custodian/uc-form-pdf"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileDown, Plus, Search, Trash2, Printer } from "lucide-react"
import type { DamagedItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export default function DamagedItemsPage() {
    const { toast } = useToast()
    const [items, setItems] = React.useState<DamagedItem[]>([])
    const [search, setSearch] = React.useState("")
    const [isAdding, setIsAdding] = React.useState(false)
    
    const pdfRef = React.useRef<HTMLDivElement>(null)
    const [activePdfItem, setActivePdfItem] = React.useState<DamagedItem | null>(null)

    // Load from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem('uc_damaged_items')
        if (saved) setItems(JSON.parse(saved))
    }, [])

    // Save to localStorage
    React.useEffect(() => {
        localStorage.setItem('uc_damaged_items', JSON.stringify(items))
    }, [items])

    const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        const newItem: DamagedItem = {
            id: Math.random().toString(36).substr(2, 9),
            itemName: formData.get("itemName") as string,
            quantity: parseInt(formData.get("quantity") as string),
            serialNumber: formData.get("serialNumber") as string,
            department: formData.get("department") as string,
            remarks: formData.get("remarks") as string,
            returnedBy: formData.get("returnedBy") as string,
            notedBy: formData.get("notedBy") as string,
            recommendedAction: "Pending",
            receivedBy: "Ms. Anabeth U. Valencia",
            custodianNote: null,
            status: "Returned",
            dateAdded: new Date().toISOString()
        }

        setItems([newItem, ...items])
        setIsAdding(false)
        toast({ title: "Report Added", description: "Damaged item report successfully recorded." })
    }

    const deleteItem = (id: string) => {
        setItems(items.filter(i => i.id !== id))
        toast({ title: "Deleted", variant: "destructive" })
    }

    const downloadPdf = async (item: DamagedItem) => {
        setActivePdfItem(item)
        
        // Wait for state update and re-render
        setTimeout(async () => {
            if (!pdfRef.current) return
            
            const canvas = await html2canvas(pdfRef.current, { scale: 2 })
            const imgData = canvas.toDataURL("image/png")
            const pdf = new jsPDF("p", "mm", "a4")
            const imgProps = pdf.getImageProperties(imgData)
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
            
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
            pdf.save(`UC-DamageReport-${item.id.slice(0,8)}.pdf`)
            
            setActivePdfItem(null)
            toast({ title: "PDF Generated", description: "Your document is ready." })
        }, 100)
    }

    const filteredItems = items.filter(i => 
        i.itemName.toLowerCase().includes(search.toLowerCase()) ||
        i.serialNumber.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-[#f4f7fa] p-4 md:p-8 flex flex-col font-sans">
            <div className="max-w-6xl mx-auto w-full">
                <UcHeader office="RETURNED DAMAGED ITEMS PORTAL" />

                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Search serial or item name..." 
                            className="pl-10 bg-white" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Dialog open={isAdding} onOpenChange={setIsAdding}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#003399] hover:bg-[#002266] text-white font-bold">
                                <Plus className="mr-2 h-5 w-5" /> New Damage Report
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-[#003399]">UC Damage Report Submission</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddItem} className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Item Name</Label>
                                    <Input name="itemName" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input name="quantity" type="number" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Serial Number</Label>
                                    <Input name="serialNumber" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Input name="department" required />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Remarks / Fault Description</Label>
                                    <Textarea name="remarks" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Returned By (Name)</Label>
                                    <Input name="returnedBy" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Noted By (Dept Head)</Label>
                                    <Input name="notedBy" required />
                                </div>
                                <div className="col-span-2 pt-4">
                                    <Button type="submit" className="w-full bg-[#003399] font-bold">Record and Generate Report</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="bg-white shadow-xl border-none">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="font-bold text-[#003399]">ITEM</TableHead>
                                <TableHead className="font-bold text-[#003399]">SERIAL#</TableHead>
                                <TableHead className="font-bold text-[#003399]">DEPT</TableHead>
                                <TableHead className="font-bold text-[#003399]">STATUS</TableHead>
                                <TableHead className="text-right font-bold text-[#003399]">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map(item => (
                                <TableRow key={item.id} className="hover:bg-blue-50/50">
                                    <TableCell>
                                        <div className="font-bold">{item.itemName}</div>
                                        <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{item.serialNumber}</TableCell>
                                    <TableCell className="text-xs uppercase">{item.department}</TableCell>
                                    <TableCell>
                                        <Badge className={
                                            item.status === 'Returned' ? 'bg-yellow-500' :
                                            item.status === 'Under Review' ? 'bg-[#003399]' :
                                            item.status === 'Repaired' ? 'bg-green-600' : 'bg-red-600'
                                        }>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => downloadPdf(item)}>
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteItem(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-gray-400 italic">No reports found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>

                <UcFooter />
            </div>

            {/* Hidden PDF container */}
            <div className="fixed -left-[2000px] top-0 overflow-hidden">
                {activePdfItem && <UcFormPdf type="damaged" data={activePdfItem} ref={pdfRef} />}
            </div>
        </div>
    )
}
