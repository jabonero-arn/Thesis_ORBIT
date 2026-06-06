
"use client"

import * as React from "react"
import Link from "next/link"
import { UcHeader } from "@/components/property-custodian/uc-header"
import { UcFooter } from "@/components/property-custodian/uc-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, PackageSearch, ArrowRight, ClipboardList, Activity } from "lucide-react"
import { useUser } from "@/firebase"
import { useRouter } from "next/navigation"

export default function PropertyCustodianHub() {
    const { user, isUserLoading } = useUser()
    const router = useRouter()

    const [stats, setStats] = React.useState({
        damaged: 0,
        inventory: 0,
        pendingReview: 0
    })

    React.useEffect(() => {
        if (!isUserLoading && (!user || user.role !== 'Property Custodian')) {
            // router.push("/login")
        }
        
        // Load stats from localStorage
        const damaged = JSON.parse(localStorage.getItem('uc_damaged_items') || '[]')
        const inventory = JSON.parse(localStorage.getItem('uc_inventory_entries') || '[]')
        
        setStats({
            damaged: damaged.length,
            inventory: inventory.length,
            pendingReview: damaged.filter((i: any) => i.status === 'Under Review').length
        })
    }, [user, isUserLoading, router])

    return (
        <div className="min-h-screen bg-[#f4f7fa] p-4 md:p-8 flex flex-col font-sans">
            <div className="max-w-6xl mx-auto w-full flex-1">
                <UcHeader />

                <div className="grid gap-6 md:grid-cols-3 mb-10">
                    <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Damaged Items</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-gray-900">{stats.damaged}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stats.pendingReview} currently under review</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-l-4 border-l-[#003399] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Total Inventory</CardTitle>
                            <PackageSearch className="h-4 w-4 text-[#003399]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-gray-900">{stats.inventory}</div>
                            <p className="text-xs text-muted-foreground mt-1">Items received by Lab Supervisors</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-l-4 border-l-green-600 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Recent Activity</CardTitle>
                            <Activity className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-gray-900">Live</div>
                            <p className="text-xs text-muted-foreground mt-1">System operational</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <Link href="/property-custodian/damaged-items" className="group">
                        <Card className="h-full bg-white transition-all hover:shadow-xl hover:-translate-y-1 border border-gray-200 cursor-pointer overflow-hidden">
                            <div className="h-2 bg-orange-500 w-full" />
                            <CardHeader className="p-8">
                                <div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                                </div>
                                <CardTitle className="text-2xl font-black text-[#003399]">Returned Damaged Items</CardTitle>
                                <CardDescription className="text-base mt-2">
                                    Process damage reports, manage approval flows, and track item disposal or repair.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 flex items-center text-[#003399] font-bold">
                                Enter Portal <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/property-custodian/inventory" className="group">
                        <Card className="h-full bg-white transition-all hover:shadow-xl hover:-translate-y-1 border border-gray-200 cursor-pointer overflow-hidden">
                            <div className="h-2 bg-[#003399] w-full" />
                            <CardHeader className="p-8">
                                <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ClipboardList className="h-8 w-8 text-[#003399]" />
                                </div>
                                <CardTitle className="text-2xl font-black text-[#003399]">Laboratory Inventory</CardTitle>
                                <CardDescription className="text-base mt-2">
                                    View items received by Lab Supervisors and manage official UC Requisition logs.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 flex items-center text-[#003399] font-bold">
                                View Records <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <UcFooter />
            </div>
        </div>
    )
}
