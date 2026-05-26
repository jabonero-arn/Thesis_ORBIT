
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
import { doc, deleteDoc } from "firebase/firestore"
import { Edit, KeyRound, Trash2 } from "lucide-react"
import { EditProfileDialog } from "./edit-profile-dialog"
import type { User as UserType, ChannelAccessRequest, StudentDepartmentAccessRequest } from "@/lib/types"
import { useAppContext } from "@/context/app-context"
import { RequestLabAccessDialog } from "./teacher/request-lab-access-dialog"
import { Badge } from "./ui/badge"
import { format } from "date-fns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { EditLabAccessDialog } from "./teacher/edit-lab-access-dialog"
import { StudentRequestDepartmentAccessDialog } from "./student/request-department-access-dialog"


export function UserProfileModal({ children, role: displayRole }: { children: React.ReactNode, role: string }) {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast();
  const { departments, channels, channelAccessRequests, studentDepartmentAccessRequests } = useAppContext();

  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isRequestAccessOpen, setIsRequestAccessOpen] = React.useState(false);
  const [isEditAccessOpen, setIsEditAccessOpen] = React.useState(false);
  const [requestToEdit, setRequestToEdit] = React.useState<ChannelAccessRequest | null>(null);
  const [isStudentRequestOpen, setIsStudentRequestOpen] = React.useState(false);


  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserType>(userProfileRef);
  
  const displayName = userProfile?.displayName || user?.displayName || "User";
  const displayEmail = user?.email || "user@example.com";
  const avatarUrl = user?.photoURL || `https://avatar.vercel.sh/${user?.email}`;
  
  const departmentName = departments.find(d => d.id === userProfile?.assignedDepartmentId)?.name;

  const teacherAccessRequests = React.useMemo(() => {
      if (!user || displayRole !== 'Teacher') return [];
      return channelAccessRequests.filter(req => req.teacherId === user.uid);
  }, [channelAccessRequests, user, displayRole]);
  
  const studentAccessRequests = React.useMemo(() => {
      if (!user || displayRole !== 'Student') return [];
      return studentDepartmentAccessRequests.filter(req => req.studentId === user.uid);
  }, [studentDepartmentAccessRequests, user, displayRole]);


  const handleEditClick = () => {
    setIsProfileOpen(false);
    setIsEditOpen(true);
  }

  const handleDeleteRequest = async (requestId: string, type: 'teacher' | 'student') => {
    if (!firestore) return;
    const collectionName = type === 'teacher' ? 'channel_access_requests' : 'student_department_access_requests';
    try {
      await deleteDoc(doc(firestore, collectionName, requestId));
      toast({ title: "Request Removed" });
    } catch (e) {
      console.error(e);
    }
  };
  
  const getStatusBadge = (status: 'pending' | 'approved' | 'denied') => {
    switch (status) {
        case 'pending': return <Badge variant="outline" className="border-amber-500 text-amber-400">Pending</Badge>;
        case 'approved': return <Badge variant="secondary" className="bg-green-800/80 border-green-700 text-green-300">Approved</Badge>;
        case 'denied': return <Badge variant="destructive" className="bg-red-900/80 border-red-700 text-red-300">Denied</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-md bg-[#111214] border-none p-0 overflow-hidden">
          <DialogTitle className="sr-only">{displayName}'s Profile</DialogTitle>
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
                  <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Member Information</h3>
                  <div className="space-y-1 text-sm">
                      {userProfile?.employeeId && <div className="flex justify-between"><span className="text-gray-400">Employee ID</span><span className="font-mono text-white">{userProfile.employeeId}</span></div>}
                      {departmentName && <div className="flex justify-between"><span className="text-gray-400">Department</span><span className="text-white">{departmentName}</span></div>}
                      <div className="flex justify-between"><span className="text-gray-400">Role</span><span className="text-white">{displayRole}</span></div>
                  </div>
              </div>
              {displayRole === 'Teacher' && (
                  <div className="mt-4"><Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => setIsRequestAccessOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Request Lab Access</Button></div>
              )}
              {displayRole === 'Student' && (
                  <div className="mt-4"><Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => setIsStudentRequestOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Request Dept Access</Button></div>
              )}
              <Button onClick={handleEditClick} variant="secondary" className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white">
                  <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <EditProfileDialog open={isEditOpen} onOpenChange={setIsEditOpen} userProfile={userProfile} displayRole={displayRole} />
      <RequestLabAccessDialog open={isRequestAccessOpen} onOpenChange={setIsRequestAccessOpen} />
      <EditLabAccessDialog open={isEditAccessOpen} onOpenChange={setIsEditAccessOpen} request={requestToEdit} />
      <StudentRequestDepartmentAccessDialog open={isStudentRequestOpen} onOpenChange={setIsStudentRequestOpen} />
    </>
  )
}
