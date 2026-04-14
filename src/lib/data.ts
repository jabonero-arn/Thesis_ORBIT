import type { Channel, User } from "@/lib/types";

export const currentUser: User = {
  id: 'user-1',
  displayName: 'Arnie Jabonero',
  email: 'arnie.jabonero@example.com',
  role: 'Student',
  avatarUrl: 'https://i.pinimg.com/736x/38/43/d4/3843d494d3ecb871de072528e60d06a8.jpg',
  idNumber: '2021-01234',
  yearLevel: '3rd Year',
  courseOrStrand: 'BS in Computer Science',
  educationLevel: 'college',
  department: 'College of Computer Studies',
  employeeId: 'EMP-98765',
};

export const channels: Channel[] = [
  {
    id: "computer-lab-1",
    name: "#computer-lab-1",
    description: "Basic computer and electronics kits",
  },
  {
    id: "computer-lab-2",
    name: "#computer-lab-2",
    description: "Advanced micro-controllers and IoT",
  },
  {
    id: "chemistry-lab-1",
    name: "#chemistry-lab-1",
    description: "General chemistry equipment",
  },
  {
    id: "robotics-lab-1",
    name: "#robotics-lab-1",
    description: "Robotics components and kits",
  },
  {
    id: "robotics-lab-2",
    name: "#robotics-lab-2",
    description: "Large mechanical and fabrication equipment",
  },
];
