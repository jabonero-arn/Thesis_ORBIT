"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Edit } from "lucide-react"

export function UserProfileModal({ children, role: displayRole }: { children: React.ReactNode, role: string }) {
  const { user } = useUser()
  const firestore = useFirestore()

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userProfileRef);
  
  const displayName = userProfile?.displayName || user?.displayName || "User";
  const displayEmail = user?.email || "user@example.com";
  const avatarUrl = user?.photoURL || `https://avatar.vercel.sh/${user?.email}`;
  
  const idNumber = userProfile?.idNumber;
  const year = userProfile?.yearLevel;
  const course = userProfile?.courseOrStrand;
  const department = userProfile?.department;
  const employeeId = userProfile?.employeeId;


  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md bg-[#111214] border-none p-0 overflow-hidden">
        <DialogTitle className="sr-only">{displayName}'s Profile</DialogTitle>
        <DialogDescription className="sr-only">Detailed profile information for {displayName}.</DialogDescription>
        <div className="relative">
            <div className="h-24 bg-zinc-700"></div>
            <div className="absolute top-16 left-4">
                <Avatar className="h-24 w-24 rounded-full border-[6px] border-[#111214]">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
        </div>
        
        <div className="p-4 pt-16">
            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
            <p className="text-sm text-gray-400">{displayEmail}</p>
        </div>

        <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-black/30">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">
                  {displayRole === 'Student' ? 'Student Information' : 'Member Information'}
                </h3>
                <div className="space-y-1 text-sm">
                    {displayRole === 'Student' ? (
                        <>
                            {idNumber && <div className="flex justify-between"><span className="text-gray-400">ID Number</span><span className="font-mono text-white">{idNumber}</span></div>}
                            {course && <div className="flex justify-between"><span className="text-gray-400">Course</span><span className="text-white">{course}</span></div>}
                            {year && <div className="flex justify-between"><span className="text-gray-400">Year Level</span><span className="text-white">{year}</span></div>}
                        </>
                    ) : (
                        <>
                             {employeeId && <div className="flex justify-between"><span className="text-gray-400">Employee ID</span><span className="font-mono text-white">{employeeId}</span></div>}
                             {department && <div className="flex justify-between"><span className="text-gray-400">Department</span><span className="text-white">{department}</span></div>}
                             <div className="flex justify-between"><span className="text-gray-400">Role</span><span className="text-white">{displayRole}</span></div>
                        </>
                    )}
                </div>
            </div>
            <Button variant="secondary" className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white">
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
