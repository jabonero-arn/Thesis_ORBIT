
"use client"

import * as React from "react"
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
import { Edit, KeyRound } from "lucide-react"
import { EditProfileDialog } from "./edit-profile-dialog"
import type { User as UserType, ChannelAccessRequest, ChannelAccessRequestStatus } from "@/lib/types"
import { useAppContext } from "@/context/app-context"
import { RequestLabAccessDialog } from "./teacher/request-lab-access-dialog"
import { Badge } from "./ui/badge"
import { format } from "date-fns"


export function UserProfileModal({ children, role: displayRole }: { children: React.ReactNode, role: string }) {
  const { user } = useUser()
  const firestore = useFirestore()
  const { departments, channels, channelAccessRequests } = useAppContext();

  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isRequestAccessOpen, setIsRequestAccessOpen] = React.useState(false);


  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserType>(userProfileRef);
  
  const displayName = userProfile?.displayName || user?.displayName || "User";
  const displayEmail = user?.email || "user@example.com";
  const avatarUrl = user?.photoURL || `https://avatar.vercel.sh/${user?.email}`;
  
  const idNumber = userProfile?.idNumber;
  const year = userProfile?.yearLevel;
  const course = userProfile?.courseOrStrand;
  const departmentName = departments.find(d => d.id === userProfile?.assignedDepartmentId)?.name;
  const employeeId = userProfile?.employeeId;

  const teacherAccessRequests = React.useMemo(() => {
      if (!user) return [];
      return channelAccessRequests.filter(req => req.teacherId === user.uid);
  }, [channelAccessRequests, user]);

  const handleEditClick = () => {
    setIsProfileOpen(false);
    setIsEditOpen(true);
  }

  const getStatusBadge = (status: ChannelAccessRequestStatus) => {
    switch (status) {
        case 'pending':
            return <Badge variant="outline">Pending</Badge>;
        case 'approved':
            return <Badge variant="secondary" className="bg-green-800/80 text-green-300">Approved</Badge>;
        case 'denied':
            return <Badge variant="destructive">Denied</Badge>;
    }
  }

  const TeacherLabRequests = () => (
      <div className="mt-4">
          <div className="p-3 rounded-lg bg-black/30">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-bold uppercase text-gray-400">My Laboratory Access</h3>
                 <Button size="sm" variant="ghost" onClick={() => setIsRequestAccessOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Request Access
                 </Button>
              </div>
              <div className="space-y-2 text-sm max-h-40 overflow-y-auto pr-2">
                  {teacherAccessRequests.length > 0 ? teacherAccessRequests.map(req => (
                      <div key={req.id} className="text-xs p-2 rounded bg-black/30">
                          <div className="flex justify-between items-center">
                              <span className="font-semibold text-white">{req.channelName.replace('#','')}</span>
                              {getStatusBadge(req.status)}
                          </div>
                          <p className="text-gray-400">For: {req.subject}</p>
                          <p className="text-gray-500 text-right">{format(new Date(req.requestedAt), 'MMM d, yyyy')}</p>
                      </div>
                  )) : (
                      <p className="text-center text-xs text-gray-500 py-4">You have not requested access to any labs.</p>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <>
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
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
                              {departmentName && <div className="flex justify-between"><span className="text-gray-400">Department</span><span className="text-white">{departmentName}</span></div>}
                              <div className="flex justify-between"><span className="text-gray-400">Role</span><span className="text-white">{displayRole}</span></div>
                          </>
                      )}
                  </div>
              </div>
              {displayRole === 'Teacher' && <TeacherLabRequests />}
              <Button onClick={handleEditClick} variant="secondary" className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white">
                  <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <EditProfileDialog 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen}
        userProfile={userProfile}
        displayRole={displayRole}
      />
      <RequestLabAccessDialog open={isRequestAccessOpen} onOpenChange={setIsRequestAccessOpen} />
    </>
  )
}
